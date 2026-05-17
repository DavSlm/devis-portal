// =====================================================
// High-level: build an Odoo sale.order draft directly from a quote_request
// row. Stores the order name on the quote_request for the second step
// ("Envoyer au client") to pick up — does NOT sync nor send any email.
// =====================================================

import {
  attachDeliveryToOrder,
  createSaleOrder,
  findOrCreatePartner,
  type AttachDeliveryResult,
  type OdooSaleOrder,
} from './client';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  countryNameToIso,
  FISCAL_POSITION_LABEL,
  getFiscalPositionId,
  isEuTransportCountry,
} from './fiscalPosition';
import { resolveProductVariant } from './products';
import type { WizardState } from '@/types/wizard';

export interface CreateDraftInput {
  requestId: string;
  /**
   * Optional override : if omitted, the orchestrator picks the product
   * automatically using resolveProductVariant() against the wizard data.
   */
  productId?: number;
  quantity: number;
  description?: string;
}

export interface CreateDraftResult {
  odooOrder: OdooSaleOrder;
  partnerId: number;
  partnerCreated: boolean;
  vatRejected: boolean;
  productResolution: { variantId: number; description: string; fallback: boolean };
  fiscalPositionId: number;
  fiscalPositionLabel: string;
  /** null si l'attache UPS a échoué — voir `deliveryError` pour la raison. */
  delivery: AttachDeliveryResult | null;
  /** Message d'erreur si le transport n'a pas pu être attaché. */
  deliveryError?: string;
}

export async function createOdooDraftFromRequest(
  input: CreateDraftInput,
): Promise<CreateDraftResult> {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('Quantité invalide');
  }

  const admin = createAdminClient();
  const { data: request, error: reqErr } = await admin
    .from('quote_requests')
    .select('*')
    .eq('id', input.requestId)
    .single();
  if (reqErr || !request) {
    throw new Error(`quote_request introuvable: ${reqErr?.message ?? 'inconnu'}`);
  }

  // ---- Resolve product variant ----
  // Caller-provided productId wins; otherwise infer from the wizard state.
  let productResolution: { variantId: number; description: string; fallback: boolean };
  if (input.productId && input.productId > 0) {
    productResolution = {
      variantId: input.productId,
      description: input.description ?? 'manual selection',
      fallback: false,
    };
  } else {
    const wizardLike: WizardState = {
      ...request,
      productType: request.product_type,
      persoLevel: request.perso_level,
      grammage: request.grammage,
      matiere: request.matiere,
      packaging: request.packaging,
      packagingId: request.packaging,
      scenteur: null,
    } as WizardState;
    const resolved = resolveProductVariant(wizardLike);
    if (!resolved) {
      throw new Error(
        "Aucun produit Odoo ne correspond à la configuration. Sélectionne manuellement depuis le dropdown.",
      );
    }
    productResolution = resolved;
  }

  // ---- Resolve or create the partner ----
  // Dédup multi-critères + création société + child contacts delivery/invoice,
  // port verbatim de gmail_to_odoo.find_or_create_partner.
  const shipping = (request.shipping_address ?? {}) as {
    contact?: string | null;
    street1?: string | null;
    street2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    carrier_phone?: string | null;
  };
  const billing = (request.billing_address ?? null) as {
    street1?: string | null;
    street2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;

  // Décompose full_name → first_name / last_name pour la création particulier.
  const fullName = (request.full_name ?? '').trim();
  const [firstName = '', ...rest] = fullName.split(/\s+/);
  const lastName = rest.join(' ');

  // Détection langue : FR par défaut (cf. _FR_ISO_CODES Python). Heuristique
  // simple : si le pays de livraison est dans la zone francophone, fr_FR ;
  // sinon en_US. Le wizard ne capture pas la langue, on infère.
  const deliveryCountryIso = countryNameToIso(shipping.country ?? null);
  const FR_COUNTRIES = new Set([
    'FR', 'BE', 'CH', 'LU', 'MC', 'MA', 'DZ', 'TN', 'CI', 'SN',
    'CM', 'HT', 'CD', 'CG', 'ML', 'BF', 'TG', 'BJ', 'NE', 'GA',
  ]);
  const lang = FR_COUNTRIES.has(deliveryCountryIso) ? 'fr_FR' : 'en_US';

  const partnerResult = await findOrCreatePartner({
    email: request.email,
    phone: request.phone,
    companyName: request.company_name,
    firstName,
    lastName,
    siret: request.siret,
    vat: request.vat_number,
    lang,
    delivery: {
      street: shipping.street1,
      street2: shipping.street2,
      zip: shipping.postal_code,
      city: shipping.city,
      countryName: shipping.country,
      countryIso: deliveryCountryIso || null,
      contactName: shipping.contact,
      carrierPhone: shipping.carrier_phone,
    },
    billing: billing
      ? {
          street: billing.street1,
          street2: billing.street2,
          zip: billing.postal_code,
          city: billing.city,
          countryName: billing.country,
          countryIso: countryNameToIso(billing.country ?? null) || null,
        }
      : null,
  });

  // ---- Fiscal position ----
  const billingIso = countryNameToIso(billing?.country ?? shipping.country ?? null);
  const deliveryIso = countryNameToIso(shipping.country ?? billing?.country ?? null);
  const hasVat = !!(request.vat_number && String(request.vat_number).trim());
  const fiscalPositionId = getFiscalPositionId(billingIso, deliveryIso, hasVat);
  const fiscalPositionLabel = FISCAL_POSITION_LABEL[fiscalPositionId] ?? 'Inconnu';

  // ---- Validity = 30 days from today ----
  const validity = new Date();
  validity.setDate(validity.getDate() + 30);
  const validityDate = validity.toISOString().slice(0, 10);

  // NOTE : on N'INJECTE PAS de description sur la ligne. Odoo doit utiliser
  // le nom natif du produit. Aucune dérive.
  //
  // On NE TOUCHE PAS au champ `note` de la sale.order : c'est là que
  // vivent les CGV Oshibori (template Odoo). Le brief client reste dans
  // Supabase (visible côté admin uniquement). Ne JAMAIS écraser ce champ.
  const order = await createSaleOrder({
    partnerId: partnerResult.partnerId,
    lines: [
      {
        productId: productResolution.variantId,
        quantity: input.quantity,
      },
    ],
    validityDate,
    clientOrderRef: `Demande #${request.id.slice(0, 8)}`,
    fiscalPositionId,
    companyId: parseInt(process.env.ODOO_COMPANY_ID ?? '1', 10),
  });

  // Mémorise le nom + id du devis Odoo sur la quote_request AVANT de
  // tenter le transport. La sale.order existe déjà côté Odoo donc on
  // veut absolument que le lien soit sauvegardé même si UPS plante après.
  // Sans ça, un retry recréerait un doublon.
  const { error: updateErr } = await admin
    .from('quote_requests')
    .update({
      odoo_order_name: order.name,
      odoo_order_id: order.id,
      status: 'reviewed',
    })
    .eq('id', request.id);
  if (updateErr) {
    throw new Error(
      `Devis ${order.name} créé dans Odoo mais impossible de mémoriser le lien côté portail : ${updateErr.message}. La migration Supabase a-t-elle été appliquée ? (colonnes odoo_order_name + odoo_order_id sur quote_requests)`,
    );
  }

  // ---- Attach UPS delivery line via choose.delivery.carrier wizard ----
  // Port verbatim de gmail_to_odoo.add_delivery_to_order.
  // Europe (set étendu UPS) → carrier 15, hors Europe → carrier 21.
  //
  // NON BLOQUANT : la sale.order existe déjà côté Odoo. Si UPS échoue
  // (timeout API, adresse partner incomplète, tarif 0…), on n'efface
  // pas le devis et on n'empêche pas l'admin de continuer. On remonte
  // l'erreur sous forme de warning ambre dans l'UI ("transport non
  // attaché — ajoute-le manuellement dans Odoo").
  const isEu = deliveryIso ? isEuTransportCountry(deliveryIso) : true;
  let delivery: AttachDeliveryResult | null = null;
  let deliveryError: string | undefined;
  try {
    delivery = await attachDeliveryToOrder(order.id, isEu);
  } catch (err) {
    deliveryError = (err as Error).message;
    console.warn(`Transport non attaché sur ${order.name} :`, deliveryError);
  }

  return {
    odooOrder: order,
    partnerId: partnerResult.partnerId,
    partnerCreated: partnerResult.created,
    vatRejected: !!partnerResult.vatRejected,
    productResolution,
    fiscalPositionId,
    fiscalPositionLabel,
    delivery,
    deliveryError,
  };
}
