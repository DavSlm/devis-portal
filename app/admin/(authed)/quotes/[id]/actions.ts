'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatEuro } from '@/lib/pricing';
import { syncOdooOrderToQuote } from '@/lib/odoo/sync';
import { createOdooDraftFromRequest } from '@/lib/odoo/createDraft';

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
  if (result.magicLink) params.set('link', result.magicLink);
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
  if (result.magicLink) params.set('link', result.magicLink);
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
