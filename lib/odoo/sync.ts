// =====================================================
// Sync orchestrator: pull an Odoo sale.order, create a `quotes` row,
// send the devis PDF + RIB en pièce jointe au client (style gmail-odoo).
// =====================================================

import { Resend } from 'resend';
import fs from 'node:fs/promises';
import path from 'node:path';
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

function renderRecapTable(
  productLines: OdooSaleOrderLine[],
  deliveryLine: OdooSaleOrderLine | null,
): string {
  const rows = productLines.map((l) => {
    const productName = Array.isArray(l.product_id) ? l.product_id[1] : '—';
    return `
      <tr>
        <td style="padding: 8px 12px 8px 0; border-bottom: 1px solid #eee; vertical-align: top;">
          <div style="font-size: 13px; color: #252525; white-space: pre-wrap;">${escapeHtml(productName)}</div>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; vertical-align: top; text-align: right; white-space: nowrap;">
          <div style="font-size: 13px; color: #252525;">${escapeHtml(formatQty(l.product_uom_qty))}</div>
          <div style="font-size: 11px; color: #888;">${escapeHtml(formatEuroFr(l.price_unit))} / u</div>
        </td>
        <td style="padding: 8px 0 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; text-align: right; white-space: nowrap;">
          <div style="font-size: 13px; color: #252525; font-weight: 600;">${escapeHtml(formatEuroFr(l.price_subtotal))}</div>
        </td>
      </tr>`;
  }).join('');
  const deliveryRow = deliveryLine
    ? `
      <tr>
        <td style="padding: 8px 12px 8px 0; border-bottom: 1px solid #eee; vertical-align: top;">
          <div style="font-size: 13px; color: #888; font-style: italic;">Transport</div>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;"></td>
        <td style="padding: 8px 0 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; text-align: right; white-space: nowrap;">
          <div style="font-size: 13px; color: #252525;">${escapeHtml(formatEuroFr(deliveryLine.price_subtotal))}</div>
        </td>
      </tr>`
    : '';
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr>
          <th style="text-align: left; padding: 6px 12px 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #B89456; border-bottom: 2px solid #EFE7D2;">Produit</th>
          <th style="text-align: right; padding: 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #B89456; border-bottom: 2px solid #EFE7D2;">Quantité</th>
          <th style="text-align: right; padding: 6px 0 6px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #B89456; border-bottom: 2px solid #EFE7D2;">Sous-total</th>
        </tr>
      </thead>
      <tbody>${rows}${deliveryRow}</tbody>
    </table>`;
}

function renderClientEmail({
  quoteNumber,
  totalHt,
  productLines,
  deliveryLine,
  odooLink,
}: ClientEmailArgs): string {
  const totalLabel = formatEuroFr(totalHt);
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #252525;">
  <div style="text-align: center; margin-bottom: 24px;">
    <img src="https://oshiboriconcept.com/cdn/shop/files/oshiboriconcept-logo-1599554503_e03c2a56-3050-444f-871a-61225ec6cf3e.png" alt="Oshibori Concept" style="height: 48px; width: auto;">
  </div>

  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">Bonjour,</p>

  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
    Merci pour votre demande de devis et l&apos;intérêt porté pour nos produits.
  </p>

  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
    Veuillez trouver en pièce jointe le devis (ou cliquez sur le bouton ci-dessous pour le consulter en ligne).
  </p>

  <div style="text-align: center; margin: 20px 0;">
    <a href="${escapeHtml(odooLink)}" style="display: inline-block; padding: 12px 28px; background: #D1B780; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px;">
      Consulter le devis ${escapeHtml(quoteNumber)}
    </a>
  </div>

  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #B89456; font-weight: 600; margin: 24px 0 8px;">
    Rappel des produits et quantités
  </div>
  ${renderRecapTable(productLines, deliveryLine)}

  <div style="background: #F5EFE0; border: 1px solid #EFE7D2; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 12px;">
      <div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #B89456; font-weight: 600;">Référence</div>
        <div style="font-size: 14px; font-weight: 600; color: #252525; font-family: monospace;">${escapeHtml(quoteNumber)}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #B89456; font-weight: 600;">Total HT</div>
        <div style="font-size: 18px; font-weight: 600; color: #252525;">${totalLabel}</div>
      </div>
    </div>
  </div>

  <p style="font-size: 14px; line-height: 1.6; margin: 16px 0 8px;">
    Je reste à votre disposition si vous avez des questions.
  </p>
  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
    Dans l&apos;attente de votre retour,
  </p>

  <div style="border-top: 1px solid #EFE7D2; padding-top: 16px; font-size: 13px; line-height: 1.6; color: #555;">
    <strong>David Salama</strong><br/>
    Oshibori Concept International<br/>
    <a href="mailto:david@oshibori-concept.com" style="color: #B89456; text-decoration: none;">david@oshibori-concept.com</a>
  </div>
</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
