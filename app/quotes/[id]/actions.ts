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
  // matches. Avoid leaking whether the quote exists.
  const admin = createAdminClient();
  const { data } = await admin
    .from('quotes')
    .select('email')
    .eq('id', id)
    .single();

  if (!data || data.email.toLowerCase() !== email) {
    // Same response whether the email is wrong or the quote is unknown.
    redirect(`/quotes/${id}/access?sent=1`);
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://devis-portal-vpmx.vercel.app';
  const { error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${appUrl}/auth/callback?next=/quotes/${id}`,
    },
  });

  if (error) {
    redirect(`/quotes/${id}/access?error=${encodeURIComponent(error.message)}`);
  }

  // The Supabase project SMTP (or our Resend integration once configured at
  // the Supabase level) actually delivers the email. Until then, Supabase
  // sends from its default sender.
  redirect(`/quotes/${id}/access?sent=1`);
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
