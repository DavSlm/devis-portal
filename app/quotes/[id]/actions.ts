'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const FROM_ADDRESS = 'Devis Oshibori <onboarding@resend.dev>';
const ADMIN_RECIPIENT = 'dasalama@icloud.com';

interface VerifiedQuote {
  id: string;
  email: string;
  quote_number: string;
  status: string;
  total_ttc: number | null;
  subtotal_ht: number | null;
}

// Loads the quote *with* an authorisation check: the current user must be
// signed in and the quote's email must match the JWT email. Returns null
// if the visitor isn't authorised — never throws to avoid leaking existence.
async function loadAuthorisedQuote(id: string): Promise<VerifiedQuote | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from('quotes')
    .select('id, email, quote_number, status, total_ttc, subtotal_ht')
    .eq('id', id)
    .single();

  if (!data) return null;
  if (data.email.toLowerCase() !== user.email.toLowerCase()) return null;
  return data;
}

export async function acceptQuote(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const quote = await loadAuthorisedQuote(id);
  if (!quote) redirect(`/quotes/${id}/access`);

  if (quote.status === 'accepted' || quote.status === 'rejected') {
    // Idempotent — don't accept twice.
    redirect(`/quotes/${id}/accepted`);
  }

  const admin = createAdminClient();
  await admin.from('quotes').update({ status: 'accepted' }).eq('id', id);
  await admin.from('quote_actions').insert({
    quote_id: id,
    action: 'accepted',
  });

  await notifyAdminOfAction({
    action: 'acceptée',
    quote,
  });

  revalidatePath(`/quotes/${id}`);
  redirect(`/quotes/${id}/accepted`);
}

export async function rejectQuote(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const reason = String(formData.get('reason') ?? '').slice(0, 1000);
  if (!id) return;

  const quote = await loadAuthorisedQuote(id);
  if (!quote) redirect(`/quotes/${id}/access`);

  if (quote.status === 'accepted' || quote.status === 'rejected') {
    redirect(`/quotes/${id}/accepted`);
  }

  const admin = createAdminClient();
  await admin.from('quotes').update({ status: 'rejected' }).eq('id', id);
  await admin.from('quote_actions').insert({
    quote_id: id,
    action: 'rejected',
    reason: reason || null,
  });

  await notifyAdminOfAction({
    action: 'refusée',
    quote,
    reason,
  });

  revalidatePath(`/quotes/${id}`);
  redirect(`/quotes/${id}/accepted`);
}

interface NotifyArgs {
  action: 'acceptée' | 'refusée';
  quote: VerifiedQuote;
  reason?: string;
}

async function notifyAdminOfAction({ action, quote, reason }: NotifyArgs) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const subject = `Devis ${quote.quote_number} ${action} par ${quote.email}`;
    const reasonHtml =
      action === 'refusée' && reason
        ? `<p style="font-size: 13px; color: #555; margin: 16px 0;"><strong>Raison :</strong><br>${escape(reason).replace(/\n/g, '<br>')}</p>`
        : '';
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_RECIPIENT,
      subject,
      html: `<div style="font-family: -apple-system, sans-serif; padding: 24px;">
  <h1 style="font-size: 18px;">Devis ${action}</h1>
  <p>Le devis <strong>${escape(quote.quote_number)}</strong> a été ${action} par <strong>${escape(quote.email)}</strong>.</p>
  ${reasonHtml}
  <p style="font-size: 12px; color: #888;">
    Total : ${quote.total_ttc ? quote.total_ttc.toFixed(2).replace('.', ',') + ' € TTC' : '—'}
  </p>
</div>`,
    });
  } catch (err) {
    console.error('admin notification failed', err);
  }
}

/**
 * Request an OTP code to access a quote.
 *
 * Returns { ok } instead of redirecting so the client component can
 * advance to the "enter code" step. The same response is returned no
 * matter whether the email/quote pair exists, to avoid leaking that.
 */
export async function requestAccessOtp(input: {
  quoteId: string;
  email: string;
}): Promise<{ ok: true }> {
  const id = (input.quoteId ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();
  if (!id || !email) return { ok: true };

  const admin = createAdminClient();
  const { data: quote } = await admin
    .from('quotes')
    .select('email, quote_number, subtotal_ht, full_name, company_name')
    .eq('id', id)
    .single();

  if (!quote || quote.email.toLowerCase() !== email) {
    // Same response either way.
    return { ok: true };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://devis-portal-vpmx.vercel.app';
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/quotes/${id}/auth` },
  });

  if (error) {
    console.error('requestAccessOtp: generateLink failed', error);
    return { ok: true };
  }

  const otp = linkData?.properties?.email_otp;
  const magicLink = linkData?.properties?.action_link;

  if (process.env.RESEND_API_KEY && otp) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: quote.email,
        subject: `Code d'accès — Devis ${quote.quote_number} Oshibori Concept`,
        html: renderAccessEmail({
          customerName: quote.full_name ?? '',
          companyName: quote.company_name ?? '',
          quoteNumber: quote.quote_number,
          code: otp,
          link: magicLink ?? '',
        }),
      });
    } catch (err) {
      console.error('requestAccessOtp: Resend send failed', err);
    }
  }

  return { ok: true };
}

interface AccessEmailArgs {
  customerName: string;
  companyName: string;
  quoteNumber: string;
  code: string;
  link: string;
}

function renderAccessEmail({
  customerName,
  companyName,
  quoteNumber,
  code,
  link,
}: AccessEmailArgs): string {
  const greet = customerName ? `Bonjour ${escape(customerName)},` : 'Bonjour,';
  const co = companyName ? ` (${escape(companyName)})` : '';
  const linkBlock = link
    ? `<div style="text-align: center; margin: 24px 0 8px;">
        <a href="${escape(link)}" style="font-size: 12px; color: #B89456; text-decoration: underline;">
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
    Code d'accès à votre devis
  </h1>
  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">${greet}</p>
  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
    Voici votre code d'accès sécurisé pour consulter le devis
    <strong>${escape(quoteNumber)}</strong>${co}&nbsp;:
  </p>
  <div style="background: #F5EFE0; border: 1px solid #EFE7D2; border-radius: 8px; padding: 28px 20px; margin: 0 0 16px; text-align: center;">
    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #B89456; font-weight: 600; margin-bottom: 12px;">
      Votre code
    </div>
    <div style="font-family: -apple-system, monospace; font-size: 40px; font-weight: 700; letter-spacing: 0.18em; color: #252525;">
      ${escape(code)}
    </div>
  </div>
  <p style="font-size: 13px; line-height: 1.6; color: #888; text-align: center; margin: 0 0 8px;">
    Tapez ce code à 6 chiffres sur la page d'accès à votre devis. Il reste valide 24 h.
  </p>
  ${linkBlock}
</div>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
