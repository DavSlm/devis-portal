// =====================================================
// High-level: build an Odoo sale.order draft directly from a quote_request
// row, then sync it back to our DB and send the magic link.
// =====================================================

import {
  attachDeliveryToOrder,
  createPartner,
  createSaleOrder,
  findPartnerByEmail,
  type AttachDeliveryResult,
  type OdooSaleOrder,
} from './client';
import { syncOdooOrderToQuote, type SyncResult } from './sync';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  countryNameToIso,
  FISCAL_POSITION_LABEL,
  getFiscalPositionId,
  isEuCountry,
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

export interface CreateDraftResult extends SyncResult {
  odooOrder: OdooSaleOrder;
  partnerId: number;
  partnerCreated: boolean;
  productResolution: { variantId: number; description: string; fallback: boolean };
  fiscalPositionId: number;
  fiscalPositionLabel: string;
  delivery: AttachDeliveryResult | null;
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
  let partner = await findPartnerByEmail(request.email);
  let partnerCreated = false;
  const shipping = (request.shipping_address ?? {}) as {
    street1?: string | null;
    street2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    country?: string | null;
  };
  const billing = (request.billing_address ?? null) as {
    country?: string | null;
  } | null;

  if (!partner) {
    const name = request.company_name || request.full_name || request.email;
    const partnerId = await createPartner({
      name,
      email: request.email,
      phone: request.phone,
      street: shipping.street1 ?? null,
      street2: shipping.street2 ?? null,
      zip: shipping.postal_code ?? null,
      city: shipping.city ?? null,
      countryName: shipping.country ?? null,
      vat: request.vat_number ?? null,
      isCompany: !!request.company_name,
    });
    partner = { id: partnerId, name, email: request.email, phone: request.phone ?? false };
    partnerCreated = true;
  }

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
  // le nom natif du produit (comme le script Python). Toute personnalisation
  // de la description serait une dérive non voulue.
  const order = await createSaleOrder({
    partnerId: partner.id,
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

  // ---- Attach UPS delivery line via choose.delivery.carrier wizard ----
  // Port verbatim de gmail_to_odoo.add_delivery_to_order.
  // Europe → carrier 15 (UPS Standard DEVIS), hors Europe → carrier 21 (Expedited).
  // Si le pays de livraison n'est pas reconnu, on suit le défaut Python : Europe.
  const isEu = deliveryIso ? isEuCountry(deliveryIso) : true;
  let delivery: AttachDeliveryResult | null = null;
  try {
    delivery = await attachDeliveryToOrder(order.id, isEu);
  } catch (err) {
    console.error('attachDeliveryToOrder failed', err);
  }

  // Pull the just-created order back into our DB and send the magic link.
  const sync = await syncOdooOrderToQuote({
    requestId: request.id,
    odooOrderName: order.name,
  });

  return {
    ...sync,
    odooOrder: order,
    partnerId: partner.id,
    partnerCreated,
    productResolution,
    fiscalPositionId,
    fiscalPositionLabel,
    delivery,
  };
}
