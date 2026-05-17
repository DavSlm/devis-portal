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

const FROM_ADDRESS = 'Devis Oshibori <onboarding@resend.dev>';

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

  // Send via Resend with PDF + RIB attached. No more OTP code in the body.
  let emailSent = false;
  let emailError: string | undefined;
  if (process.env.RESEND_API_KEY) {
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
          totalHt: snapshot.order.amount_untaxed,
          hasRib: attachments.length > 1,
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
  customerName: string;
  companyName: string;
  quoteNumber: string;
  totalHt: number;
  hasRib: boolean;
}

function renderClientEmail({
  customerName,
  companyName,
  quoteNumber,
  totalHt,
  hasRib,
}: ClientEmailArgs): string {
  const greet = customerName ? `Bonjour ${escapeHtml(customerName)},` : 'Bonjour,';
  const co = companyName ? ` (${escapeHtml(companyName)})` : '';
  const totalLabel = `${totalHt.toFixed(2).replace('.', ',')} €`;
  const attachmentLine = hasRib
    ? "Veuillez trouver, en pièce jointe, votre devis ainsi que le RIB associé."
    : "Veuillez trouver, en pièce jointe, votre devis.";
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #252525;">
  <div style="text-align: center; margin-bottom: 24px;">
    <img src="https://oshiboriconcept.com/cdn/shop/files/oshiboriconcept-logo-1599554503_e03c2a56-3050-444f-871a-61225ec6cf3e.png" alt="Oshibori Concept" style="height: 48px; width: auto;">
  </div>
  <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 16px; color: #252525; text-align: center;">
    Votre devis est prêt
  </h1>
  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">${greet}</p>
  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
    Merci pour votre demande${co}. ${attachmentLine}
  </p>
  <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
    Pour valider ce devis, il vous suffit de nous renvoyer cet email signé
    avec la mention « Bon pour accord » et de procéder au règlement de
    l&apos;acompte selon les conditions indiquées.
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
    <div style="font-size: 24px; font-weight: 600; color: #252525;">${totalLabel}</div>
  </div>
  <p style="font-size: 13px; line-height: 1.6; color: #888; text-align: center; margin: 0;">
    Pour toute question, répondez simplement à cet email.
    <br/>L&apos;équipe Oshibori Concept reste à votre disposition.
  </p>
</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
