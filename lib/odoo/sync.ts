// =====================================================
// Sync orchestrator: pull an Odoo sale.order, create a `quotes` row,
// send the devis PDF + RIB en pièce jointe au client (style gmail-odoo).
// =====================================================

import { Resend } from 'resend';
import fs from 'node:fs/promises';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  fetchSaleOrderSnapshot,
  type OdooSaleOrderLine,
  type OdooSaleSnapshot,
} from './client';

// Expéditeur officiel — exige que le domaine oshibori-concept.com soit
// vérifié dans Resend (Dashboard → Domains). Sinon Resend renverra une
// erreur "domain not verified" et l'email ne partira pas.
const FROM_ADDRESS = 'David Salama <david@oshibori-concept.com>';
const REPLY_TO = 'david@oshibori-concept.com';

// Fichier RIB joint à chaque devis envoyé. À placer dans public/documents/
// (deploy avec le bundle Next.js). Si absent, l'email part avec seulement
// le PDF du devis Odoo et on log un warning.
const RIB_FILE_PATH = path.join(process.cwd(), 'public', 'documents', 'rib.pdf');

// Signature email officielle (HTML), chargée une fois au démarrage.
// Synchrone exprès — on veut crasher au boot si le fichier manque.
const SIGNATURE_HTML = readFileSync(
  path.join(process.cwd(), 'lib', 'odoo', 'gmail_signature.html'),
  'utf-8',
);

export interface SyncResult {
  quoteId: string;
  quoteNumber: string;
  emailSent: boolean;
  emailError?: string;
}

export interface SyncArgs {
  requestId: string;
  odooOrderName: string; // e.g. 'S06736'
}

export async function syncOdooOrderToQuote({
  requestId,
  odooOrderName,
}: SyncArgs): Promise<SyncResult> {
  const admin = createAdminClient();

  // Fetch source quote_request.
  const { data: request, error: reqErr } = await admin
    .from('quote_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (reqErr || !request) {
    throw new Error(`quote_request introuvable: ${reqErr?.message ?? 'inconnu'}`);
  }

  // Fetch Odoo snapshot (creates access_token if needed).
  const snapshot = await fetchSaleOrderSnapshot(odooOrderName);
  if (!snapshot) {
    throw new Error(`Sale order ${odooOrderName} introuvable dans Odoo`);
  }

  // Derive legacy fields from Odoo so the existing /quotes/[id] view can display them.
  const productSubtotal = snapshot.productLines.reduce((s, l) => s + l.price_subtotal, 0);
  const totalQuantity = snapshot.productLines.reduce((s, l) => s + l.product_uom_qty, 0);
  const unitPrice =
    snapshot.productLines.length === 1
      ? snapshot.productLines[0].price_unit
      : totalQuantity > 0
        ? productSubtotal / totalQuantity
        : 0;

  // Validity from Odoo, fallback to 30 days.
  const validityIso = snapshot.order.validity_date
    ? new Date(snapshot.order.validity_date).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const quoteInsert = {
    quote_number: snapshot.order.name,
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
    unit_price: unitPrice,
    quantity: Math.round(totalQuantity),
    subtotal_ht: snapshot.order.amount_untaxed,
    vat_rate: null,
    vat_amount: snapshot.order.amount_tax,
    total_ttc: snapshot.order.amount_total,
    conditions: null,
    delivery_delay_days: null,
    sent_at: new Date().toISOString(),
    expires_at: validityIso,
    status: 'sent' as const,

    odoo_sale_order_id: snapshot.order.id,
    odoo_order_name: snapshot.order.name,
    odoo_access_token: snapshot.accessToken,
    odoo_snapshot: serialisableSnapshot(snapshot),
    odoo_synced_at: snapshot.fetchedAt,
  };

  // Find existing quote for this Odoo order (so re-syncing updates rather
  // than duplicates). Avoids ON CONFLICT, which is fragile with partial
  // unique indexes via PostgREST.
  const { data: existing } = await admin
    .from('quotes')
    .select('id')
    .eq('odoo_order_name', snapshot.order.name)
    .maybeSingle();

  let quote: { id: string; quote_number: string };
  if (existing) {
    const { data: updated, error: updErr } = await admin
      .from('quotes')
      .update(quoteInsert)
      .eq('id', existing.id)
      .select('id, quote_number')
      .single();
    if (updErr || !updated) {
      throw new Error(`Mise à jour devis échouée: ${updErr?.message ?? 'inconnu'}`);
    }
    quote = updated;
  } else {
    const { data: inserted, error: insErr } = await admin
      .from('quotes')
      .insert(quoteInsert)
      .select('id, quote_number')
      .single();
    if (insErr || !inserted) {
      throw new Error(`Insertion devis échouée: ${insErr?.message ?? 'inconnu'}`);
    }
    quote = inserted;
  }

  await admin
    .from('quote_requests')
    .update({ status: 'converted' })
    .eq('id', request.id);

  // Récupère le PDF du devis Odoo + le RIB statique pour les joindre à
  // l'email client. Si le PDF Odoo échoue, on bloque (le client recevrait
  // un email vide). Si le RIB est absent, on envoie quand même avec un warning.
  const attachments: Array<{ filename: string; content: Buffer }> = [];

  try {
    const pdfResp = await fetch(snapshot.pdfUrl, { cache: 'no-store' });
    if (!pdfResp.ok) {
      throw new Error(
        `Odoo PDF HTTP ${pdfResp.status} sur ${snapshot.pdfUrl}`,
      );
    }
    const pdfBuf = Buffer.from(await pdfResp.arrayBuffer());
    attachments.push({
      filename: `${snapshot.order.name}.pdf`,
      content: pdfBuf,
    });
  } catch (err) {
    throw new Error(
      `Impossible de récupérer le PDF du devis Odoo : ${(err as Error).message}`,
    );
  }

  try {
    const ribBuf = await fs.readFile(RIB_FILE_PATH);
    attachments.push({ filename: 'RIB Oshibori Concept.pdf', content: ribBuf });
  } catch {
    console.warn(
      `RIB introuvable à ${RIB_FILE_PATH} — email envoyé sans RIB. Place le fichier rib.pdf dans public/documents/.`,
    );
  }

  // Send via Resend with PDF + RIB attached, body with line-items recap
  // and direct Odoo mail-view link (no portal navigation needed).
  let emailSent = false;
  let emailError: string | undefined;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: FROM_ADDRESS,
        replyTo: REPLY_TO,
        to: request.email,
        subject: `Votre devis ${quote.quote_number} — Oshibori Concept`,
        html: renderClientEmail({
          quoteNumber: quote.quote_number,
          totalHt: snapshot.order.amount_untaxed,
          productLines: snapshot.productLines,
          deliveryLine: snapshot.deliveryLine,
          odooLink: snapshot.mailViewUrl,
        }),
        attachments,
      });
      emailSent = true;
    } catch (err) {
      emailError = (err as Error).message;
      console.error('Resend send to client failed', err);
    }
  } else {
    emailError = 'RESEND_API_KEY non configuré';
  }

  return {
    quoteId: quote.id,
    quoteNumber: quote.quote_number,
    emailSent,
    emailError,
  };
}

// Trim the snapshot down to JSON-serialisable fields for storage. Drops
// the helper portalUrl/pdfUrl (recomputable from token+id) since the
// access_token is stored on its own column.
function serialisableSnapshot(s: OdooSaleSnapshot) {
  return {
    order: s.order,
    lines: s.lines,
    productLines: s.productLines.map(stripOdooLine),
    deliveryLine: s.deliveryLine ? stripOdooLine(s.deliveryLine) : null,
    fetchedAt: s.fetchedAt,
  };
}

function stripOdooLine(l: OdooSaleOrderLine) {
  return {
    id: l.id,
    name: l.name,
    product_id: l.product_id,
    quantity: l.product_uom_qty,
    price_unit: l.price_unit,
    price_subtotal: l.price_subtotal,
    price_total: l.price_total,
    is_delivery: l.is_delivery,
    display_type: l.display_type,
  };
}

// =====================================================
// Client email template
// =====================================================

interface ClientEmailArgs {
  quoteNumber: string;
  totalHt: number;
  productLines: OdooSaleOrderLine[];
  deliveryLine: OdooSaleOrderLine | null;
  odooLink: string;
}

function formatEuroFr(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
}

function formatQty(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString('fr-FR')
    : n.toLocaleString('fr-FR', { minimumFractionDigits: 2 });
}

/**
 * Récap produits + quantités sous forme HTML brut, équivalent texte d'une
 * énumération (« 1. Produit X — 480 unités », etc.). Pas de style fantaisie :
 * c'est juste pour rappeler ce qui est dans le devis joint.
 */
function renderRecapList(
  productLines: OdooSaleOrderLine[],
  deliveryLine: OdooSaleOrderLine | null,
): string {
  const items = productLines.map((l) => {
    const productName = Array.isArray(l.product_id) ? l.product_id[1] : '—';
    return `<li>${escapeHtml(productName)} — ${escapeHtml(formatQty(l.product_uom_qty))} unité(s) (${escapeHtml(formatEuroFr(l.price_subtotal))})</li>`;
  }).join('');
  const transport = deliveryLine
    ? `<li>Transport — ${escapeHtml(formatEuroFr(deliveryLine.price_subtotal))}</li>`
    : '';
  return `<ul style="margin: 8px 0 16px 0; padding-left: 20px;">${items}${transport}</ul>`;
}

/**
 * Email transactionnel sobre, style « David écrit lui-même ». Pas de logo
 * en header, pas de bouton coloré, pas de cartes. Juste du texte + un lien
 * + la signature officielle de David à la fin.
 */
function renderClientEmail({
  quoteNumber,
  totalHt,
  productLines,
  deliveryLine,
  odooLink,
}: ClientEmailArgs): string {
  const totalLabel = formatEuroFr(totalHt);
  return `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #000;">
<p>Bonjour,</p>

<p>Merci pour votre demande de devis et l'intérêt porté pour nos produits.</p>

<p>Veuillez trouver en pièce jointe le devis, également consultable en ligne via ce lien :<br>
<a href="${escapeHtml(odooLink)}">${escapeHtml(odooLink)}</a></p>

<p><strong>Rappel des produits et quantités dans le devis :</strong></p>
${renderRecapList(productLines, deliveryLine)}

<p>Référence : <strong>${escapeHtml(quoteNumber)}</strong> — Total HT : <strong>${escapeHtml(totalLabel)}</strong></p>

<p>Je reste à votre disposition si vous avez des questions.<br>
Dans l'attente de votre retour,</p>

${SIGNATURE_HTML}
</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
