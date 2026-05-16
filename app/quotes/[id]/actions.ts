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

export async function requestAccessLink(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!id || !email) redirect(`/quotes/${id}/access?error=invalid`);

  // Look up the quote with the admin client; only send a link if the email
  // matches. We deliberately return the same response regardless to avoid
  // leaking whether the quote/email pair exists.
  const admin = createAdminClient();
  const { data: quote } = await admin
    .from('quotes')
    .select('email, quote_number, subtotal_ht, full_name, company_name')
    .eq('id', id)
    .single();

  if (!quote || quote.email.toLowerCase() !== email) {
    redirect(`/quotes/${id}/access?sent=1`);
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://devis-portal-vpmx.vercel.app';
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      // Path-based redirect — survives Supabase Auth's query-param handling.
      redirectTo: `${appUrl}/quotes/${id}/auth`,
    },
  });

  if (error) {
    redirect(`/quotes/${id}/access?error=${encodeURIComponent(error.message)}`);
  }

  const magicLink = linkData?.properties?.action_link;

  // generateLink only *generates* the URL; it does NOT send the email.
  // We deliver it ourselves via Resend.
  if (process.env.RESEND_API_KEY && magicLink) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: quote.email,
        subject: `Accès à votre devis ${quote.quote_number} — Oshibori Concept`,
        html: renderAccessEmail({
          customerName: quote.full_name ?? '',
          companyName: quote.company_name ?? '',
          quoteNumber: quote.quote_number,
          link: magicLink,
        }),
      });
    } catch (err) {
      // Log silently — show the same UI either way to avoid leaking info.
      console.error('requestAccessLink: Resend send failed', err);
    }
  }

  redirect(`/quotes/${id}/access?sent=1`);
}

interface AccessEmailArgs {
  customerName: string;
  companyName: string;
  quoteNumber: string;
  link: string;
}

function renderAccessEmail({
  customerName,
  companyName,
  quoteNumber,
  link,
}: AccessEmailArgs): string {
  const greet = customerName ? `Bonjour ${escape(customerName)},` : 'Bonjour,';
  const co = companyName ? ` (${escape(companyName)})` : '';
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #252525;">
  <div style="text-align: center; margin-bottom: 24px;">
    <img src="https://oshiboriconcept.com/cdn/shop/files/oshiboriconcept-logo-1599554503_e03c2a56-3050-444f-871a-61225ec6cf3e.png" alt="Oshibori Concept" style="height: 48px; width: auto;">
  </div>
  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px; color: #252525; text-align: center;">
    Votre nouveau lien d&apos;accès
  </h1>
  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">${greet}</p>
  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
    Voici un nouveau lien sécurisé pour consulter le devis
    <strong>${escape(quoteNumber)}</strong>${co}.
  </p>
  <div style="text-align: center; margin: 0 0 24px;">
    <a href="${escape(link)}" style="display: inline-block; padding: 14px 32px; background: #D1B780; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px;">
      Voir mon devis
    </a>
  </div>
  <p style="font-size: 12px; line-height: 1.6; color: #888; text-align: center; margin: 0;">
    Ce lien est à usage unique et expire dans environ 1 h.
  </p>
</div>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
