import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeQuoteTotal, formatEuro, isPlateauxCategory } from '@/lib/pricing';
import type { WizardState } from '@/types/wizard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Recipient — until the oshibori-concept.com domain is verified in Resend,
// we can only send to the account owner's verified email.
const NOTIFICATION_RECIPIENT = 'dasalama@icloud.com';
const FROM_ADDRESS = 'Devis Oshibori <onboarding@resend.dev>';

export async function POST(req: Request) {
  let payload: Omit<WizardState, 'attachmentFile'>;
  let file: File | null = null;
  let draftId: string | null = null;

  try {
    const fd = await req.formData();
    const raw = fd.get('payload');
    if (typeof raw !== 'string') {
      return NextResponse.json({ error: 'payload manquant' }, { status: 400 });
    }
    payload = JSON.parse(raw);
    const f = fd.get('file');
    if (f instanceof File && f.size > 0) file = f;
    const did = fd.get('draftId');
    if (typeof did === 'string' && did.trim()) draftId = did.trim();
  } catch (err) {
    return NextResponse.json(
      { error: `payload invalide: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  // Basic guard rails — strict enough to catch garbage, lenient on optional fields.
  if (!payload.email || !/\S+@\S+\.\S+/.test(payload.email)) {
    return NextResponse.json({ error: 'email invalide' }, { status: 400 });
  }
  if (!payload.productType) {
    return NextResponse.json({ error: 'productType manquant' }, { status: 400 });
  }

  const { unitPrice, total } = computeQuoteTotal(payload as WizardState);
  const fullName = `${payload.firstName} ${payload.lastName}`.trim();

  const supabase = createAdminClient();

  // Si on a un draftId, on convertit la ligne draft existante en
  // demande complète plutôt que de créer un doublon. Avantage : on
  // garde le même ID UUID donc les éventuels liens / activité sont
  // préservés. On vide aussi `last_saved_at` côté logique pour que
  // l'admin voie clairement que c'est passé à "soumis".
  const fields = {
    email: payload.email,
    full_name: fullName || null,
    company_name: payload.entrepriseName || null,
    vat_number: payload.tvaFr || payload.tvaUe || null,
    siret: payload.siret || null,
    phone: payload.phone || null,

    shipping_address: {
      contact: payload.deliveryContactName || null,
      street1: payload.deliveryStreet1 || null,
      street2: payload.deliveryStreet2 || null,
      postal_code: payload.deliveryPostalCode || null,
      city: payload.deliveryCity || null,
      state: payload.deliveryState || null,
      country: payload.deliveryCountry || null,
      carrier_phone: payload.carrierPhone || null,
    },
    billing_address: payload.billingSame
      ? null
      : {
          street1: payload.billingStreet1 || null,
          street2: payload.billingStreet2 || null,
          postal_code: payload.billingPostalCode || null,
          city: payload.billingCity || null,
          country: payload.billingCountry || null,
        },

    product_type: payload.productType,
    category: payload.category || null,
    perso_level: payload.persoLevel || null,
    grammage: payload.grammage || null,
    matiere: payload.matiere || null,
    packaging: payload.packagingId || null,

    quantity: payload.quantity || null,
    brief: payload.brief || null,
    file_url: file ? file.name : null,

    estimated_unit_price: unitPrice,
    estimated_total: total,

    internal_notes: payload.message || null,
    status: 'pending_review' as const,
  };

  let id: string | null = null;

  // Si la requête vient d'un wizard qui a auto-sauvegardé en draft,
  // on update la ligne existante au lieu d'insérer un doublon.
  if (draftId) {
    const { data: draft } = await supabase
      .from('quote_requests')
      .select('id')
      .eq('draft_id', draftId)
      .maybeSingle();
    if (draft) {
      const { error } = await supabase
        .from('quote_requests')
        .update(fields)
        .eq('id', draft.id);
      if (error) {
        console.error('quote_requests update from draft error', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
      }
      id = draft.id;
    }
  }

  if (!id) {
    const { data: inserted, error: dbError } = await supabase
      .from('quote_requests')
      .insert(fields)
      .select('id')
      .single();
    if (dbError) {
      console.error('quote_requests insert error', dbError);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
    id = inserted.id;
  }

  if (!id) {
    // Shouldn't happen — both paths set id — but TS narrowing needs it.
    return NextResponse.json({ error: 'inconnu' }, { status: 500 });
  }

  // Fire and forget — we don't fail the request if email fails (the row is saved).
  try {
    await sendNotificationEmail({ payload, file, unitPrice, total, id });
  } catch (err) {
    console.error('Resend send error', err);
  }

  return NextResponse.json({ id });
}

interface NotifyArgs {
  payload: Omit<WizardState, 'attachmentFile'>;
  file: File | null;
  unitPrice: number | null;
  total: number | null;
  id: string;
}

async function sendNotificationEmail({ payload, file, unitPrice, total, id }: NotifyArgs) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);

  const isPlateaux = isPlateauxCategory(payload as WizardState);
  const fullName = `${payload.firstName} ${payload.lastName}`.trim();
  const subjectCo = payload.entrepriseName || fullName || payload.email;
  const subject = `Nouvelle demande de devis — ${subjectCo}`;

  const rows: [string, string][] = [
    ['Profil', payload.profile === 'professionnel' ? 'Entreprise' : 'Particulier'],
    payload.entrepriseName ? ['Entreprise', payload.entrepriseName] : null,
    ['Contact', fullName],
    ['Email', payload.email],
    ['Téléphone', payload.phone],
    payload.country ? ['Pays', payload.country] : null,
    payload.siret ? ['SIRET', payload.siret] : null,
    payload.tvaFr ? ['TVA FR', payload.tvaFr] : null,
    payload.tvaUe ? ['TVA UE', payload.tvaUe] : null,
    ['Produit', payload.productType ?? '—'],
    payload.persoLevel ? ['Personnalisation', payload.persoLevel] : null,
    payload.category ? ['Catégorie', payload.category] : null,
    payload.grammage ? ['Grammage', payload.grammage] : null,
    payload.matiere ? ['Matière', payload.matiere] : null,
    payload.packagingId ? ['Emballage', payload.packagingId] : null,
    payload.quantity
      ? [
          'Quantité',
          `${payload.quantity.toLocaleString('fr-FR')} ${isPlateaux ? 'plateaux' : 'Oshibori'}`,
        ]
      : null,
    unitPrice != null
      ? [
          isPlateaux ? 'Prix estimé / carton' : 'Prix estimé / unité',
          `${formatEuro(unitPrice)} HT`,
        ]
      : null,
    total != null ? ['Total estimé', `${formatEuro(total)} HT`] : null,
    payload.brief ? ['Brief', payload.brief] : null,
    file ? ['Fichier joint', file.name] : null,
    payload.deliveryContactName ? ['Contact livraison', payload.deliveryContactName] : null,
    [
      'Adresse livraison',
      [
        payload.deliveryStreet1,
        payload.deliveryStreet2,
        `${payload.deliveryPostalCode} ${payload.deliveryCity}`.trim(),
        payload.deliveryState,
        payload.deliveryCountry,
      ]
        .filter(Boolean)
        .join(', '),
    ],
    payload.carrierPhone ? ['Tél. transporteur', payload.carrierPhone] : null,
    !payload.billingSame
      ? [
          'Adresse facturation',
          [
            payload.billingStreet1,
            payload.billingStreet2,
            `${payload.billingPostalCode} ${payload.billingCity}`.trim(),
            payload.billingCountry,
          ]
            .filter(Boolean)
            .join(', '),
        ]
      : null,
    payload.message ? ['Message', payload.message] : null,
    ['Référence interne', id],
  ].filter((x): x is [string, string] => x != null);

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 18px; margin: 0 0 8px; color: #252525;">Nouvelle demande de devis</h1>
  <p style="font-size: 13px; color: #888; margin: 0 0 24px;">
    Reçue le ${new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
  </p>
  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding: 6px 12px 6px 0; color: #888; vertical-align: top; width: 180px; border-bottom: 1px solid #eee;">${escapeHtml(k)}</td><td style="padding: 6px 0; color: #252525; border-bottom: 1px solid #eee; white-space: pre-wrap;">${escapeHtml(v)}</td></tr>`,
      )
      .join('')}
  </table>
</div>`;

  const attachments: { filename: string; content: Buffer }[] = [];
  if (file) {
    const buf = Buffer.from(await file.arrayBuffer());
    attachments.push({ filename: file.name, content: buf });
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: NOTIFICATION_RECIPIENT,
    subject,
    html,
    replyTo: payload.email,
    attachments: attachments.length ? attachments : undefined,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
