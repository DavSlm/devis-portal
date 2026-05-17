'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatEuro } from '@/lib/pricing';
import { syncOdooOrderToQuote } from '@/lib/odoo/sync';
import { createOdooDraftFromRequest } from '@/lib/odoo/createDraft';
import {
  attachDeliveryToOrder,
  findOrderDeliveryLines,
  findOrderProductLines,
  findPartnerByEmail,
  unlinkOrderLine,
  updateOrderLine,
  updatePartner,
  updateSaleOrder,
  upsertChildAddress,
  executeKw,
} from '@/lib/odoo/client';
import {
  countryNameToIso,
  getFiscalPositionId,
  isEuTransportCountry,
} from '@/lib/odoo/fiscalPosition';
import { resolveProductVariant } from '@/lib/odoo/products';
import type { WizardState } from '@/types/wizard';

// =====================================================
// Sprint 4 — Odoo-based flow
// =====================================================

/**
 * Pull a sale.order from Odoo, create/update our quotes row, send the
 * magic link to the client. Triggered from the admin UI when David pastes
 * an Odoo order number on a quote_request.
 */
export async function syncFromOdoo(formData: FormData): Promise<void> {
  const requestId = String(formData.get('requestId') ?? '');
  const odooOrderName = String(formData.get('odooOrderName') ?? '').trim();

  if (!requestId) throw new Error('requestId manquant');
  if (!odooOrderName) throw new Error("N° Odoo manquant (ex. S06736)");

  let result;
  try {
    result = await syncOdooOrderToQuote({ requestId, odooOrderName });
  } catch (err) {
    const params = new URLSearchParams({
      odooError: (err as Error).message,
    });
    redirect(`/admin/quotes/${requestId}?${params.toString()}`);
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/quotes/${requestId}`);

  const params = new URLSearchParams({
    sent: '1',
    emailOk: result.emailSent ? '1' : '0',
  });
  if (result.emailError) params.set('emailError', result.emailError);
  if (result.quoteId) params.set('quote', result.quoteId);
  params.set('odooName', result.quoteNumber);

  redirect(`/admin/quotes/${requestId}?${params.toString()}`);
}

interface CreateQuoteInput {
  requestId: string;
  unitPrice: number;
  quantity: number;
  vatRate: number;
  deliveryDelayDays: number | null;
  conditions: string;
  expiresInDays: number;
}

const FROM_ADDRESS = 'Devis Oshibori <onboarding@resend.dev>';

export async function updateInternalNotes(formData: FormData) {
  const id = String(formData.get('id'));
  const notes = String(formData.get('internal_notes') ?? '');
  const supabase = createAdminClient();
  await supabase
    .from('quote_requests')
    .update({ internal_notes: notes })
    .eq('id', id);
  revalidatePath(`/admin/quotes/${id}`);
}

export async function archiveRequest(formData: FormData) {
  const id = String(formData.get('id'));
  const supabase = createAdminClient();
  await supabase.from('quote_requests').update({ status: 'archived' }).eq('id', id);
  redirect('/admin');
}

export async function createAndSendQuote(formData: FormData): Promise<void> {
  const requestId = String(formData.get('requestId'));
  const unitPrice = parseFloat(String(formData.get('unitPrice') ?? '0'));
  const quantity = parseInt(String(formData.get('quantity') ?? '0'), 10);
  const vatRate = parseFloat(String(formData.get('vatRate') ?? '20'));
  const deliveryDelayDays = parseIntOrNull(String(formData.get('deliveryDelayDays') ?? ''));
  const conditions = String(formData.get('conditions') ?? '');
  const expiresInDays = parseInt(String(formData.get('expiresInDays') ?? '30'), 10);

  if (!requestId) throw new Error('requestId manquant');
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Prix invalide');
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantité invalide');

  const result = await createAndSendQuoteImpl({
    requestId,
    unitPrice,
    quantity,
    vatRate,
    deliveryDelayDays,
    conditions,
    expiresInDays,
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/quotes/${requestId}`);

  const params = new URLSearchParams({
    sent: '1',
    emailOk: result.emailSent ? '1' : '0',
  });
  if (result.magicLink) params.set('link', result.magicLink);
  if (result.emailError) params.set('emailError', result.emailError);
  if (result.quoteId) params.set('quote', result.quoteId);

  redirect(`/admin/quotes/${requestId}?${params.toString()}`);
}

/**
 * Build a fresh sale.order draft in Odoo from the quote_request data
 * (creating the partner if needed), then immediately sync it back to our
 * DB and send the magic link to the client.
 *
 *   form fields: requestId, quantity
 *
 * Le produit est résolu automatiquement depuis la configuration du wizard
 * (perso_level / grammage / matiere / packaging) — même logique que le
 * script Python gmail_to_odoo. Pas de sélection manuelle côté admin.
 *
 * La quantité saisie est persistée sur quote_requests pour rester cohérente
 * avec ce qui a été envoyé à Odoo.
 */
export async function generateOdooDraft(formData: FormData): Promise<void> {
  const requestId = String(formData.get('requestId') ?? '');
  const quantity = parseInt(String(formData.get('quantity') ?? '0'), 10);

  if (!requestId) throw new Error('requestId manquant');
  if (!quantity || quantity <= 0) throw new Error('Quantité invalide');

  const supabase = createAdminClient();

  // Idempotence : si un devis Odoo existe déjà pour cette demande, on
  // redirige sans en créer un nouveau. Couvre le double-clic réseau lent
  // ou la soumission concurrente du formulaire.
  const { data: existing } = await supabase
    .from('quote_requests')
    .select('odoo_order_name')
    .eq('id', requestId)
    .single();
  if (existing?.odoo_order_name) {
    redirectBack(requestId, {
      odooCreated: '1',
      odooName: existing.odoo_order_name,
    });
  }

  await supabase
    .from('quote_requests')
    .update({ quantity })
    .eq('id', requestId);

  let result;
  try {
    result = await createOdooDraftFromRequest({
      requestId,
      quantity,
    });
  } catch (err) {
    const params = new URLSearchParams({
      odooError: (err as Error).message,
    });
    redirect(`/admin/quotes/${requestId}?${params.toString()}`);
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/quotes/${requestId}`);

  // Devis créé dans Odoo mais PAS envoyé au client. David doit valider/
  // ajuster dans Odoo puis cliquer "Envoyer au client" depuis l'admin.
  const params = new URLSearchParams({
    odooCreated: '1',
    odooName: result.odooOrder.name,
  });
  if (result.vatRejected) params.set('vatRejected', '1');
  if (result.deliveryError) params.set('deliveryWarning', result.deliveryError);
  redirect(`/admin/quotes/${requestId}?${params.toString()}`);
}

/**
 * Envoie le magic link au client pour un devis Odoo déjà créé via
 * "Créer dans Odoo". Lit `odoo_order_name` depuis la quote_request et
 * réutilise le flow sync existant.
 */
export async function sendQuoteToClient(formData: FormData): Promise<void> {
  const requestId = String(formData.get('requestId') ?? '');
  if (!requestId) throw new Error('requestId manquant');

  const supabase = createAdminClient();
  const { data: request, error } = await supabase
    .from('quote_requests')
    .select('odoo_order_name')
    .eq('id', requestId)
    .single();
  if (error || !request) throw new Error('Demande introuvable');
  if (!request.odoo_order_name) {
    const params = new URLSearchParams({
      odooError: 'Aucun devis Odoo lié à cette demande — clique d\'abord sur "Créer dans Odoo".',
    });
    redirect(`/admin/quotes/${requestId}?${params.toString()}`);
  }

  let result;
  try {
    result = await syncOdooOrderToQuote({
      requestId,
      odooOrderName: request.odoo_order_name,
    });
  } catch (err) {
    const params = new URLSearchParams({
      odooError: (err as Error).message,
    });
    redirect(`/admin/quotes/${requestId}?${params.toString()}`);
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/quotes/${requestId}`);

  const params = new URLSearchParams({
    sent: '1',
    emailOk: result.emailSent ? '1' : '0',
    odooName: result.quoteNumber,
  });
  if (result.emailError) params.set('emailError', result.emailError);
  if (result.quoteId) params.set('quote', result.quoteId);

  redirect(`/admin/quotes/${requestId}?${params.toString()}`);
}

/**
 * Regenerate a fresh magic link for an already-created quote. Used when the
 * previous one expired or was sent to the wrong channel.
 */
export async function regenerateClientLink(formData: FormData): Promise<void> {
  const requestId = String(formData.get('requestId'));
  const quoteId = String(formData.get('quoteId'));
  if (!requestId || !quoteId) throw new Error('Paramètres manquants');

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, email, quote_number, subtotal_ht, full_name, company_name')
    .eq('id', quoteId)
    .single();

  if (!quote) throw new Error('Devis introuvable');

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://devis-portal-vpmx.vercel.app';
  const { data: linkData, error: linkErr } =
    await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: quote.email,
      options: { redirectTo: `${appUrl}/quotes/${quote.id}/auth` },
    });
  if (linkErr) throw new Error(`generateLink: ${linkErr.message}`);
  const magicLink = linkData?.properties?.action_link;
  const emailOtp = linkData?.properties?.email_otp;
  const accessUrl = `${appUrl}/quotes/${quote.id}/access`;

  let emailSent = false;
  let emailError: string | undefined;
  if (process.env.RESEND_API_KEY && emailOtp) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: quote.email,
        subject: `Votre devis ${quote.quote_number} — Oshibori Concept`,
        html: renderClientEmail({
          customerName: quote.full_name ?? '',
          companyName: quote.company_name ?? '',
          quoteNumber: quote.quote_number,
          totalHt: quote.subtotal_ht,
          code: emailOtp,
          accessUrl,
          link: magicLink ?? '',
        }),
      });
      emailSent = true;
    } catch (err) {
      emailError = (err as Error).message;
    }
  }

  const params = new URLSearchParams({
    sent: '1',
    emailOk: emailSent ? '1' : '0',
    quote: quote.id,
  });
  if (magicLink) params.set('link', magicLink);
  if (emailError) params.set('emailError', emailError);
  redirect(`/admin/quotes/${requestId}?${params.toString()}`);
}

interface CreateQuoteResult {
  quoteId: string;
  magicLink?: string;
  emailSent: boolean;
  emailError?: string;
}

async function createAndSendQuoteImpl(input: CreateQuoteInput): Promise<CreateQuoteResult> {
  const supabase = createAdminClient();

  // Load the source request.
  const { data: request, error: reqErr } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('id', input.requestId)
    .single();
  if (reqErr || !request) throw new Error(`Demande introuvable: ${reqErr?.message}`);

  // Compute totals.
  const subtotalHt = Number((input.unitPrice * input.quantity).toFixed(2));
  const vatAmount = Number(((subtotalHt * input.vatRate) / 100).toFixed(2));
  const totalTtc = Number((subtotalHt + vatAmount).toFixed(2));

  // Quote number: DV-YYYYMMDD-NNNN where NNNN is the sequence for the day.
  const today = new Date();
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', dayStart.toISOString());
  const dayCode = today.toISOString().slice(0, 10).replace(/-/g, '');
  const quoteNumber = `DV-${dayCode}-${String((count || 0) + 1).padStart(4, '0')}`;

  // Expiry.
  const expiresAt = new Date(today);
  expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

  // Insert quote.
  const { data: quote, error: insErr } = await supabase
    .from('quotes')
    .insert({
      quote_number: quoteNumber,
      quote_request_id: request.id,
      email: request.email,
      full_name: request.full_name,
      company_name: request.company_name,
      product_type: request.product_type,
      config: {
        category: request.category,
        perso_level: request.perso_level,
        grammage: request.grammage,
        matiere: request.matiere,
        packaging: request.packaging,
        brief: request.brief,
        file_url: request.file_url,
      },
      unit_price: input.unitPrice,
      quantity: input.quantity,
      subtotal_ht: subtotalHt,
      vat_rate: input.vatRate,
      vat_amount: vatAmount,
      total_ttc: totalTtc,
      conditions: input.conditions || null,
      delivery_delay_days: input.deliveryDelayDays,
      sent_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'sent',
    })
    .select('id, quote_number')
    .single();

  if (insErr || !quote) throw new Error(`Erreur insertion devis: ${insErr?.message}`);

  // Mark the source request as converted.
  await supabase
    .from('quote_requests')
    .update({ status: 'converted' })
    .eq('id', request.id);

  // Generate a Supabase magic link for the client, then send via Resend so the
  // email is on-brand. The link redirects to /auth/callback which sets the
  // session cookie and forwards to /quotes/[id].
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://devis-portal-vpmx.vercel.app';
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: request.email,
    options: {
      // Path-based redirect — survives Supabase Auth's query-param handling.
      redirectTo: `${appUrl}/quotes/${quote.id}/auth`,
    },
  });
  if (linkErr) {
    console.error('generateLink error', linkErr);
    // Don't bail — the quote is created. Admin can resend manually.
  }

  const magicLink = linkData?.properties?.action_link;
  const emailOtp = linkData?.properties?.email_otp;
  const accessUrl = `${appUrl}/quotes/${quote.id}/access`;

  let emailSent = false;
  let emailError: string | undefined;
  if (process.env.RESEND_API_KEY && emailOtp) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: request.email,
        subject: `Votre devis ${quote.quote_number} — Oshibori Concept`,
        html: renderClientEmail({
          customerName: request.full_name ?? '',
          companyName: request.company_name ?? '',
          quoteNumber: quote.quote_number,
          totalHt: subtotalHt,
          code: emailOtp,
          accessUrl,
          link: magicLink ?? '',
        }),
      });
      emailSent = true;
    } catch (err) {
      emailError = (err as Error).message;
      console.error('Resend send to client failed', err);
    }
  }

  return { quoteId: quote.id, magicLink, emailSent, emailError };
}

function parseIntOrNull(s: string): number | null {
  const v = parseInt(s, 10);
  return Number.isFinite(v) ? v : null;
}

interface ClientEmailArgs {
  customerName: string;
  companyName: string;
  quoteNumber: string;
  totalHt: number;
  code: string;
  accessUrl: string;
  link: string;
}

function renderClientEmail({
  customerName,
  companyName,
  quoteNumber,
  totalHt,
  code,
  accessUrl,
  link,
}: ClientEmailArgs): string {
  const greet = customerName ? `Bonjour ${escapeHtml(customerName)},` : 'Bonjour,';
  const co = companyName ? ` (${escapeHtml(companyName)})` : '';
  const linkBlock = link
    ? `<div style="text-align: center; margin: 0 0 16px;">
        <a href="${escapeHtml(link)}" style="font-size: 12px; color: #B89456; text-decoration: underline;">
          Ou cliquez ici pour accéder directement à votre devis
        </a>
      </div>`
    : '';
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #252525;">
  <div style="text-align: center; margin-bottom: 24px;">
    <img src="https://oshiboriconcept.com/cdn/shop/files/oshiboriconcept-logo-1599554503_e03c2a56-3050-444f-871a-61225ec6cf3e.png" alt="Oshibori Concept" style="height: 48px; width: auto;">
  </div>
  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px; color: #252525; text-align: center;">
    Votre devis est prêt
  </h1>
  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">${greet}</p>
  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
    Nous avons préparé votre devis personnalisé${co}.
    Vous pouvez le consulter, télécharger le PDF et l&apos;accepter en ligne.
  </p>
  <div style="background: #F5EFE0; border: 1px solid #EFE7D2; border-radius: 8px; padding: 20px; margin: 0 0 20px; text-align: center;">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #B89456; font-weight: 600; margin-bottom: 6px;">
      Référence
    </div>
    <div style="font-size: 16px; font-weight: 600; color: #252525; margin-bottom: 14px;">
      ${escapeHtml(quoteNumber)}
    </div>
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #B89456; font-weight: 600; margin-bottom: 6px;">
      Total HT
    </div>
    <div style="font-size: 24px; font-weight: 600; color: #252525;">
      ${formatEuro(totalHt)}
    </div>
  </div>
  <div style="background: #fff; border: 1px solid #EFE7D2; border-radius: 8px; padding: 24px 20px; margin: 0 0 20px; text-align: center;">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #B89456; font-weight: 600; margin-bottom: 12px;">
      Votre code d'accès
    </div>
    <div style="font-family: -apple-system, monospace; font-size: 40px; font-weight: 700; letter-spacing: 0.18em; color: #252525;">
      ${escapeHtml(code)}
    </div>
  </div>
  <div style="text-align: center; margin: 0 0 16px;">
    <a href="${escapeHtml(accessUrl)}" style="display: inline-block; padding: 14px 32px; background: #D1B780; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px;">
      Voir mon devis
    </a>
  </div>
  <p style="font-size: 13px; line-height: 1.6; color: #888; text-align: center; margin: 0 0 8px;">
    Tapez ce code sur la page d'accès, ou cliquez sur le bouton ci-dessus.
    Le code reste valide 24 h.
  </p>
  ${linkBlock}
</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =====================================================
// Édition des demandes de devis depuis l'admin.
// Si la demande a déjà un devis Odoo lié (odoo_order_id), les modifs
// sont aussi propagées sur le res.partner / sale.order correspondants.
// =====================================================

interface RequestWithOdoo {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  vat_number: string | null;
  siret: string | null;
  phone: string | null;
  shipping_address: Record<string, string | null> | null;
  billing_address: Record<string, string | null> | null;
  product_type: string | null;
  perso_level: string | null;
  category: string | null;
  grammage: string | null;
  matiere: string | null;
  packaging: string | null;
  quantity: number | null;
  odoo_order_id: number | null;
  odoo_order_name: string | null;
}

async function loadRequest(requestId: string): Promise<RequestWithOdoo> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (error || !data) throw new Error(`Demande introuvable : ${error?.message ?? ''}`);
  return data as RequestWithOdoo;
}

async function getPartnerIdForOrder(orderId: number): Promise<number | null> {
  const rows = await executeKw<Array<{ partner_id: [number, string] | false }>>(
    'sale.order',
    'read',
    [[orderId]],
    { fields: ['partner_id'] },
  );
  const m2o = rows[0]?.partner_id;
  return Array.isArray(m2o) ? m2o[0] : null;
}

/**
 * Cherche le sale.order Odoo lié à une quote_request via le pattern
 * "Demande #<id-court>" sur client_order_ref. Backfill aussi
 * `odoo_order_id` / `odoo_order_name` côté Supabase pour éviter de
 * refaire le lookup à chaque modif future.
 */
async function backfillOdooOrderForRequest(
  requestId: string,
): Promise<{ orderId: number; orderName: string } | null> {
  const ref = `Demande #${requestId.slice(0, 8)}`;
  const rows = await executeKw<Array<{ id: number; name: string }>>(
    'sale.order',
    'search_read',
    [[['client_order_ref', '=', ref]]],
    { fields: ['id', 'name'], order: 'create_date desc', limit: 1 },
  );
  const order = rows[0];
  if (!order) return null;

  const supabase = createAdminClient();
  await supabase
    .from('quote_requests')
    .update({ odoo_order_id: order.id, odoo_order_name: order.name })
    .eq('id', requestId);
  return { orderId: order.id, orderName: order.name };
}

/**
 * Résout l'order Odoo lié : utilise `odoo_order_id` s'il est setté,
 * sinon tente un backfill via client_order_ref. Retourne null si rien
 * ne match (= aucun devis Odoo n'a encore été créé pour cette demande).
 */
async function resolveOdooOrderId(
  request: RequestWithOdoo,
): Promise<number | null> {
  if (request.odoo_order_id) return request.odoo_order_id;
  const found = await backfillOdooOrderForRequest(request.id);
  return found?.orderId ?? null;
}

function redirectBack(
  requestId: string,
  extra: Record<string, string> = {},
): never {
  const params = new URLSearchParams(extra);
  const qs = params.toString();
  redirect(`/admin/quotes/${requestId}${qs ? `?${qs}` : ''}`);
}

export async function updateContact(formData: FormData): Promise<void> {
  const requestId = String(formData.get('requestId') ?? '');
  if (!requestId) throw new Error('requestId manquant');

  const full_name = String(formData.get('full_name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const company_name = String(formData.get('company_name') ?? '').trim();
  const siret = String(formData.get('siret') ?? '').trim();
  const vat_number = String(formData.get('vat_number') ?? '').trim();

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    redirectBack(requestId, { odooError: 'Email invalide.' });
  }

  // Snapshot avant pour détecter un changement d'email.
  const before = await loadRequest(requestId);
  const emailChanged = !!before.email && before.email !== email;

  // Si l'email change ET qu'un devis Odoo est déjà lié : check qu'un autre
  // partner Odoo n'a pas déjà ce nouvel email. Si c'est le cas, on bloque
  // pour éviter d'écraser un partner non lié ou de créer un conflit.
  let odooOrderIdForCheck: number | null = null;
  if (emailChanged) {
    odooOrderIdForCheck = await resolveOdooOrderId(before);
    if (odooOrderIdForCheck) {
      const currentPartnerId = await getPartnerIdForOrder(odooOrderIdForCheck);
      const collision = await findPartnerByEmail(email);
      if (collision && collision.id !== currentPartnerId) {
        redirectBack(requestId, {
          odooError: `L'email « ${email} » est déjà attribué à « ${collision.name} » (Odoo id=${collision.id}). Modifie manuellement le bon partner ou fusionne les doublons côté Odoo avant de continuer.`,
        });
      }
    }
  }

  const supabase = createAdminClient();
  await supabase
    .from('quote_requests')
    .update({
      full_name: full_name || null,
      email,
      phone: phone || null,
      company_name: company_name || null,
      siret: siret || null,
      vat_number: vat_number || null,
    })
    .eq('id', requestId);

  // Sync Odoo si un devis est déjà lié (avec backfill auto si besoin).
  const request = await loadRequest(requestId);
  const odooOrderId = odooOrderIdForCheck ?? (await resolveOdooOrderId(request));
  let vatRejected = false;
  if (odooOrderId) {
    const partnerId = await getPartnerIdForOrder(odooOrderId);
    if (partnerId) {
      const isCompany = !!company_name;
      const result = await updatePartner(partnerId, {
        name: isCompany ? company_name : full_name || email,
        email,
        phone,
        vat: vat_number,
        siret,
      });
      vatRejected = result.vatRejected;
    }
  }

  revalidatePath(`/admin/quotes/${requestId}`);
  redirectBack(requestId, vatRejected ? { vatRejected: '1' } : {});
}

export async function updateShipping(formData: FormData): Promise<void> {
  const requestId = String(formData.get('requestId') ?? '');
  if (!requestId) throw new Error('requestId manquant');

  const shipping = {
    contact: (String(formData.get('contact') ?? '').trim() || null) as string | null,
    street1: (String(formData.get('street1') ?? '').trim() || null) as string | null,
    street2: (String(formData.get('street2') ?? '').trim() || null) as string | null,
    postal_code:
      (String(formData.get('postal_code') ?? '').trim() || null) as string | null,
    city: (String(formData.get('city') ?? '').trim() || null) as string | null,
    state: (String(formData.get('state') ?? '').trim() || null) as string | null,
    country: (String(formData.get('country') ?? '').trim() || null) as string | null,
    carrier_phone:
      (String(formData.get('carrier_phone') ?? '').trim() || null) as string | null,
  };

  const supabase = createAdminClient();
  await supabase
    .from('quote_requests')
    .update({ shipping_address: shipping })
    .eq('id', requestId);

  const request = await loadRequest(requestId);
  const odooOrderId = await resolveOdooOrderId(request);
  if (odooOrderId) {
    const partnerId = await getPartnerIdForOrder(odooOrderId);
    if (partnerId) {
      // Update main partner (street/zip/city/country dupliqués côté Python).
      await updatePartner(partnerId, {
        street: shipping.street1,
        street2: shipping.street2,
        zip: shipping.postal_code,
        city: shipping.city,
        countryName: shipping.country,
        phone: shipping.carrier_phone || request.phone || null,
      });
      // Update child delivery (ou crée s'il n'existe pas).
      await upsertChildAddress(partnerId, 'delivery', {
        name: shipping.contact ?? '',
        street: shipping.street1,
        street2: shipping.street2,
        zip: shipping.postal_code,
        city: shipping.city,
        countryName: shipping.country,
        email: request.email ?? undefined,
        phone: shipping.carrier_phone || request.phone || null,
      });
      // Recompute fiscal position from new country.
      const deliveryIso = countryNameToIso(shipping.country);
      const billing = request.billing_address;
      const billingIso = countryNameToIso(
        (billing?.country as string | null) ?? shipping.country ?? null,
      );
      const hasVat = !!(request.vat_number && request.vat_number.trim());
      const fpId = getFiscalPositionId(billingIso, deliveryIso, hasVat);
      await updateSaleOrder(odooOrderId, { fiscalPositionId: fpId });
    }
  }

  revalidatePath(`/admin/quotes/${requestId}`);
  redirectBack(requestId);
}

export async function updateBilling(formData: FormData): Promise<void> {
  const requestId = String(formData.get('requestId') ?? '');
  if (!requestId) throw new Error('requestId manquant');

  const sameAsShipping = formData.get('same_as_shipping') === '1';

  let billing: Record<string, string | null> | null = null;
  if (!sameAsShipping) {
    billing = {
      street1: String(formData.get('street1') ?? '').trim() || null,
      street2: String(formData.get('street2') ?? '').trim() || null,
      postal_code: String(formData.get('postal_code') ?? '').trim() || null,
      city: String(formData.get('city') ?? '').trim() || null,
      country: String(formData.get('country') ?? '').trim() || null,
    };
  }

  const supabase = createAdminClient();
  await supabase
    .from('quote_requests')
    .update({ billing_address: billing })
    .eq('id', requestId);

  const request = await loadRequest(requestId);
  const odooOrderId = await resolveOdooOrderId(request);
  if (odooOrderId && billing) {
    const partnerId = await getPartnerIdForOrder(odooOrderId);
    if (partnerId) {
      await upsertChildAddress(partnerId, 'invoice', {
        street: billing.street1,
        street2: billing.street2,
        zip: billing.postal_code,
        city: billing.city,
        countryName: billing.country,
        email: request.email ?? undefined,
        phone: request.phone ?? null,
      });
      // Recompute fiscal position (billing country can change it).
      const shipping = request.shipping_address;
      const deliveryIso = countryNameToIso(
        (shipping?.country as string | null) ?? null,
      );
      const billingIso = countryNameToIso(billing.country ?? deliveryIso);
      const hasVat = !!(request.vat_number && request.vat_number.trim());
      const fpId = getFiscalPositionId(billingIso, deliveryIso, hasVat);
      await updateSaleOrder(odooOrderId, { fiscalPositionId: fpId });
    }
  }

  revalidatePath(`/admin/quotes/${requestId}`);
  redirectBack(requestId);
}

export async function updateProductConfig(formData: FormData): Promise<void> {
  const requestId = String(formData.get('requestId') ?? '');
  if (!requestId) throw new Error('requestId manquant');

  const product_type = String(formData.get('product_type') ?? '').trim() || null;
  const perso_level = String(formData.get('perso_level') ?? '').trim() || null;
  const category = String(formData.get('category') ?? '').trim() || null;
  const grammage = String(formData.get('grammage') ?? '').trim() || null;
  const matiere = String(formData.get('matiere') ?? '').trim() || null;
  const packaging = String(formData.get('packaging') ?? '').trim() || null;
  const quantityStr = String(formData.get('quantity') ?? '').trim();
  const quantity = quantityStr ? parseInt(quantityStr, 10) : null;

  const supabase = createAdminClient();

  // Snapshot avant pour comparer.
  const before = await loadRequest(requestId);

  await supabase
    .from('quote_requests')
    .update({
      product_type,
      perso_level,
      category,
      grammage,
      matiere,
      packaging,
      quantity,
    })
    .eq('id', requestId);

  const odooOrderId = await resolveOdooOrderId(before);
  if (odooOrderId) {
    // Résout le nouveau variant. Si différent → unlink + recréation.
    const wizardLike: WizardState = {
      productType: product_type,
      persoLevel: perso_level,
      category,
      grammage,
      matiere,
      packaging,
      packagingId: packaging,
      scenteur: null,
    } as WizardState;
    const resolved = resolveProductVariant(wizardLike);
    if (!resolved) {
      redirectBack(requestId, {
        odooError:
          "Nouvelle config produit non résolue côté Odoo — corrige et réessaie.",
      });
    }

    const lineIds = await findOrderProductLines(odooOrderId);
    const existingLineId = lineIds[0];

    if (!existingLineId) {
      redirectBack(requestId, {
        odooError:
          "Aucune ligne produit trouvée sur le devis Odoo — recrée le devis.",
      });
    }

    const beforeWizardLike: WizardState = {
      productType: before.product_type,
      persoLevel: before.perso_level,
      category: before.category,
      grammage: before.grammage,
      matiere: before.matiere,
      packaging: before.packaging,
      packagingId: before.packaging,
      scenteur: null,
    } as WizardState;
    const beforeResolved = resolveProductVariant(beforeWizardLike);

    if (resolved!.variantId !== beforeResolved?.variantId) {
      // Variant change → unlink l'ancienne ligne, recrée une nouvelle pour
      // que Odoo déclenche les onchange (price_unit, tax_ids).
      await unlinkOrderLine(existingLineId!);
      await executeKw<number>('sale.order.line', 'create', [
        {
          order_id: odooOrderId,
          product_id: resolved!.variantId,
          product_uom_qty: quantity ?? before.quantity ?? 1,
        },
      ]);

      // Re-déclenche le transport : le poids / volume du nouveau produit
      // peut différer, donc le tarif UPS calculé sur l'ancien variant
      // n'est plus valide. On unlink toutes les lignes is_delivery puis
      // on appelle à nouveau attachDeliveryToOrder pour recalculer.
      const deliveryLineIds = await findOrderDeliveryLines(odooOrderId);
      for (const lid of deliveryLineIds) await unlinkOrderLine(lid);

      const shipping = before.shipping_address;
      const deliveryIso = countryNameToIso(
        (shipping?.country as string | null) ?? null,
      );
      const isEu = deliveryIso ? isEuTransportCountry(deliveryIso) : true;
      try {
        await attachDeliveryToOrder(odooOrderId, isEu);
      } catch (err) {
        redirectBack(requestId, {
          odooError: `Variant changé mais transport non rattaché : ${(err as Error).message}`,
        });
      }
    } else if (quantity && quantity !== before.quantity) {
      // Même variant, juste la quantité change.
      await updateOrderLine(existingLineId!, { quantity });
    }
  }

  revalidatePath(`/admin/quotes/${requestId}`);
  redirectBack(requestId);
}
