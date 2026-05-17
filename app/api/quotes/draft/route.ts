// =====================================================
// Auto-save brouillon de wizard.
//
// Le client (wizard côté navigateur) appelle ce endpoint à chaque
// transition d'étape avec un draftId stable (généré et stocké en
// localStorage). On upsert une ligne dans `quote_requests` avec
// status='draft'. Si c'est la première fois qu'un email valide est
// renseigné sur ce draft, on envoie une notif à l'admin pour qu'il
// puisse relancer le client s'il n'achève jamais la demande.
// =====================================================

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import type { WizardState } from '@/types/wizard';
import { computeQuoteTotal } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Destinataire de la notif "demande commencée" — même boîte que les
// soumissions complètes (cf. submit/route.ts).
const NOTIFICATION_RECIPIENT = 'dasalama@icloud.com';
const FROM_ADDRESS = 'David Salama <david@oshibori-concept.com>';

interface DraftPayload {
  draftId: string;
  payload: Partial<Omit<WizardState, 'attachmentFile'>>;
}

export async function POST(req: Request) {
  let body: DraftPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const draftId = (body.draftId ?? '').trim();
  if (!draftId || draftId.length > 80) {
    return NextResponse.json({ error: 'draftId invalide' }, { status: 400 });
  }
  const p = body.payload ?? {};

  // On sauvegarde même sans email — utile pour avoir la stat funnel.
  // La notif ne part que si l'email est valide.
  const email = (p.email ?? '').trim();
  const emailValid = !!email && /\S+@\S+\.\S+/.test(email);

  const fullName = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
  let unitPrice: number | null = null;
  let total: number | null = null;
  try {
    const totals = computeQuoteTotal(p as WizardState);
    unitPrice = totals.unitPrice;
    total = totals.total;
  } catch {
    // Pricing partial — on l'ignore tant que la config n'est pas complète.
  }

  const fields = {
    draft_id: draftId,
    email: emailValid ? email : 'draft@oshibori-concept.com',
    full_name: fullName || null,
    company_name: p.entrepriseName || null,
    vat_number: p.tvaFr || p.tvaUe || null,
    siret: p.siret || null,
    phone: p.phone || null,
    shipping_address:
      p.deliveryStreet1 || p.deliveryCity || p.deliveryCountry
        ? {
            contact: p.deliveryContactName || null,
            street1: p.deliveryStreet1 || null,
            street2: p.deliveryStreet2 || null,
            postal_code: p.deliveryPostalCode || null,
            city: p.deliveryCity || null,
            state: p.deliveryState || null,
            country: p.deliveryCountry || null,
            carrier_phone: p.carrierPhone || null,
          }
        : null,
    billing_address:
      p.billingSame === false &&
      (p.billingStreet1 || p.billingCity || p.billingCountry)
        ? {
            street1: p.billingStreet1 || null,
            street2: p.billingStreet2 || null,
            postal_code: p.billingPostalCode || null,
            city: p.billingCity || null,
            country: p.billingCountry || null,
          }
        : null,
    product_type: p.productType || null,
    category: p.category || null,
    perso_level: p.persoLevel || null,
    grammage: p.grammage || null,
    matiere: p.matiere || null,
    packaging: p.packagingId || null,
    quantity: typeof p.quantity === 'number' && p.quantity > 0 ? p.quantity : null,
    brief: p.brief || null,
    estimated_unit_price: unitPrice,
    estimated_total: total,
    internal_notes: p.message || null,
    status: 'draft',
    last_saved_at: new Date().toISOString(),
  };

  const supabase = createAdminClient();

  // Upsert by draft_id. PostgREST `on_conflict` requires the partial
  // unique index to be applicable — on l'a sur (draft_id WHERE NOT NULL).
  const { data: existing } = await supabase
    .from('quote_requests')
    .select('id, draft_notified_at, status')
    .eq('draft_id', draftId)
    .maybeSingle();

  let id: string;
  let shouldNotify = false;

  if (!existing) {
    const { data: inserted, error } = await supabase
      .from('quote_requests')
      .insert(fields)
      .select('id')
      .single();
    if (error) {
      console.error('draft insert error', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
    id = inserted.id;
    shouldNotify = emailValid; // première sauvegarde + email valide → notif
  } else {
    // Si la demande est déjà passée à pending_review/converted, on ne
    // l'écrase pas comme un brouillon : le client a terminé entretemps.
    if (existing.status && existing.status !== 'draft') {
      return NextResponse.json({ id: existing.id, ignored: true });
    }
    const { error } = await supabase
      .from('quote_requests')
      .update(fields)
      .eq('id', existing.id);
    if (error) {
      console.error('draft update error', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
    id = existing.id;
    shouldNotify = emailValid && !existing.draft_notified_at;
  }

  if (shouldNotify) {
    try {
      await sendDraftNotification({ id, payload: p, email });
      await supabase
        .from('quote_requests')
        .update({ draft_notified_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      // Pas critique : le draft est sauvegardé, l'admin pourra le voir
      // dans le tab Brouillons même sans email automatique.
      console.error('draft notif error', err);
    }
  }

  return NextResponse.json({ id });
}

interface NotifyDraftArgs {
  id: string;
  email: string;
  payload: Partial<Omit<WizardState, 'attachmentFile'>>;
}

async function sendDraftNotification({ id, email, payload }: NotifyDraftArgs) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);

  const fullName = `${payload.firstName ?? ''} ${payload.lastName ?? ''}`.trim();
  const co = payload.entrepriseName ? ` (${payload.entrepriseName})` : '';

  const rows: Array<[string, string]> = [
    ['Email', email],
    fullName ? ['Contact', fullName] : null,
    payload.entrepriseName ? ['Entreprise', payload.entrepriseName] : null,
    payload.phone ? ['Téléphone', payload.phone] : null,
    payload.productType ? ['Produit', payload.productType] : null,
    payload.persoLevel ? ['Personnalisation', payload.persoLevel] : null,
    payload.grammage ? ['Grammage', payload.grammage] : null,
    payload.matiere ? ['Matière', payload.matiere] : null,
    payload.packagingId ? ['Emballage', payload.packagingId] : null,
    payload.quantity ? ['Quantité', String(payload.quantity)] : null,
    payload.deliveryCountry ? ['Pays livraison', payload.deliveryCountry] : null,
    payload.deliveryCity ? ['Ville livraison', payload.deliveryCity] : null,
    payload.brief ? ['Brief', payload.brief] : null,
    ['Référence interne', id],
  ].filter((x): x is [string, string] => x != null);

  const subject = `⏸ Demande de devis commencée — ${
    payload.entrepriseName || fullName || email
  }`;

  const html = `
<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #000; max-width: 640px;">
  <p>Un visiteur a <strong>commencé</strong> une demande de devis sur devis.oshiboriconcept.com${co} mais ne l'a pas (encore) terminée.</p>
  <p>Voici les informations qu'il a renseignées jusqu'ici :</p>
  <table style="border-collapse: collapse; width: 100%; font-size: 13px;">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding: 4px 12px 4px 0; color: #888; vertical-align: top; width: 160px;">${escapeHtml(
            k,
          )}</td><td style="padding: 4px 0; color: #252525;">${escapeHtml(v)}</td></tr>`,
      )
      .join('')}
  </table>
  <p style="margin-top: 16px;">
    Tu peux retrouver cette demande dans l'admin (onglet <strong>Brouillons</strong>) et la relancer si elle reste incomplète.
  </p>
</div>`;

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: NOTIFICATION_RECIPIENT,
    subject,
    html,
    replyTo: email,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
