// =====================================================
// Odoo JSON-RPC client
// Tested against Odoo 19 (oshibori.odoo.com).
// =====================================================

import { randomUUID } from 'crypto';

interface OdooEnv {
  url: string;
  db: string;
  user: string;
  password: string;
}

function getEnv(): OdooEnv {
  const url = process.env.ODOO_URL;
  const db = process.env.ODOO_DB;
  const user = process.env.ODOO_USER;
  const password = process.env.ODOO_PASSWORD;
  if (!url || !db || !user || !password) {
    throw new Error('Odoo env vars missing: ODOO_URL/DB/USER/PASSWORD');
  }
  return { url, db, user, password };
}

interface JsonRpcResponse<T> {
  jsonrpc: string;
  id: number | null;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: {
      name?: string;
      message?: string;
      arguments?: unknown[];
    };
  };
}

async function jsonRpc<T>(
  url: string,
  service: string,
  method: string,
  args: unknown[],
): Promise<T> {
  const res = await fetch(`${url.replace(/\/$/, '')}/jsonrpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service, method, args },
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Odoo HTTP ${res.status}`);
  }
  const body = (await res.json()) as JsonRpcResponse<T>;
  if (body.error) {
    const inner = body.error.data?.message || body.error.message;
    throw new Error(`Odoo: ${inner}`);
  }
  if (body.result === undefined) {
    throw new Error('Odoo: empty response');
  }
  return body.result;
}

// Authenticate and cache the uid for the lifetime of the server process.
let cachedUid: number | null = null;

export async function odooAuth(): Promise<number> {
  if (cachedUid) return cachedUid;
  const env = getEnv();
  const uid = await jsonRpc<number | false>(env.url, 'common', 'authenticate', [
    env.db,
    env.user,
    env.password,
    {},
  ]);
  if (!uid) throw new Error('Odoo: authentication failed');
  cachedUid = uid;
  return uid;
}

export async function executeKw<T>(
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {},
): Promise<T> {
  const env = getEnv();
  const uid = await odooAuth();
  return jsonRpc<T>(env.url, 'object', 'execute_kw', [
    env.db,
    uid,
    env.password,
    model,
    method,
    args,
    kwargs,
  ]);
}

// =====================================================
// Domain types for sale.order data we care about
// =====================================================

// Odoo "Many2one" fields come back as [id, display_name] tuples — or false.
export type M2O = [number, string] | false;

export interface OdooSaleOrder {
  id: number;
  name: string;
  state: string;
  partner_id: M2O;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  date_order: string;
  validity_date: string | false;
  client_order_ref: string | false;
  note: string | false;
  currency_id: M2O;
  fiscal_position_id: M2O;
  payment_term_id: M2O;
  order_line: number[];
  access_token: string | false;
  access_url: string;
}

export interface OdooSaleOrderLine {
  id: number;
  name: string;
  product_id: M2O;
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
  price_total: number;
  tax_ids: number[];
  display_type: string | false;
  is_delivery: boolean;
}

const SALE_ORDER_FIELDS = [
  'id',
  'name',
  'state',
  'partner_id',
  'amount_untaxed',
  'amount_tax',
  'amount_total',
  'date_order',
  'validity_date',
  'client_order_ref',
  'note',
  'currency_id',
  'fiscal_position_id',
  'payment_term_id',
  'order_line',
  'access_token',
  'access_url',
];

const SALE_ORDER_LINE_FIELDS = [
  'id',
  'name',
  'product_id',
  'product_uom_qty',
  'price_unit',
  'price_subtotal',
  'price_total',
  'tax_ids',
  'display_type',
  'is_delivery',
];

// Search a sale order by display name (e.g., "S06736"). Returns null if not found.
export async function findSaleOrderByName(name: string): Promise<OdooSaleOrder | null> {
  const rows = await executeKw<OdooSaleOrder[]>(
    'sale.order',
    'search_read',
    [[['name', '=', name]]],
    { fields: SALE_ORDER_FIELDS, limit: 1 },
  );
  return rows[0] ?? null;
}

export async function readSaleOrder(id: number): Promise<OdooSaleOrder | null> {
  const rows = await executeKw<OdooSaleOrder[]>(
    'sale.order',
    'read',
    [[id]],
    { fields: SALE_ORDER_FIELDS },
  );
  return rows[0] ?? null;
}

export async function readSaleOrderLines(
  ids: number[],
): Promise<OdooSaleOrderLine[]> {
  if (!ids.length) return [];
  return executeKw<OdooSaleOrderLine[]>(
    'sale.order.line',
    'read',
    [ids],
    { fields: SALE_ORDER_LINE_FIELDS },
  );
}

// Ensure the order has a portal access_token so we can build public URLs.
// Returns the (existing or freshly created) token.
export async function ensureAccessToken(id: number, currentToken: string | false): Promise<string> {
  if (currentToken) return currentToken;
  const token = randomUUID();
  await executeKw<boolean>('sale.order', 'write', [[id], { access_token: token }]);
  return token;
}

export function portalUrl(saleOrderId: number, token: string): string {
  const env = getEnv();
  return `${env.url.replace(/\/$/, '')}/my/orders/${saleOrderId}?access_token=${token}`;
}

export function pdfUrl(saleOrderId: number, token: string): string {
  return `${portalUrl(saleOrderId, token)}&report_type=pdf&download=true`;
}

// =====================================================
// Partners (res.partner) — port verbatim de gmail_to_odoo.find_or_create_partner
// =====================================================

export interface OdooPartner {
  id: number;
  name: string;
  email: string | false;
  phone: string | false;
}

export async function findPartnerByEmail(email: string): Promise<OdooPartner | null> {
  if (!email) return null;
  const rows = await executeKw<OdooPartner[]>(
    'res.partner',
    'search_read',
    [[['email', '=ilike', email]]],
    { fields: ['id', 'name', 'email', 'phone'], limit: 1 },
  );
  return rows[0] ?? null;
}

async function searchCompanyPartner(
  domain: unknown[],
): Promise<OdooPartner | null> {
  const rows = await executeKw<OdooPartner[]>(
    'res.partner',
    'search_read',
    [domain],
    { fields: ['id', 'name', 'email', 'phone'], limit: 1 },
  );
  return rows[0] ?? null;
}

export async function findCountryIdByName(name: string): Promise<number | null> {
  if (!name) return null;
  const rows = await executeKw<Array<{ id: number; name: string }>>(
    'res.country',
    'search_read',
    [['|', ['name', '=ilike', name], ['code', '=', name.toUpperCase()]]],
    { fields: ['id', 'name'], limit: 1 },
  );
  return rows[0]?.id ?? null;
}

async function findCountryIdByIso(iso: string): Promise<number | null> {
  if (!iso) return null;
  const rows = await executeKw<Array<{ id: number }>>(
    'res.country',
    'search_read',
    [[['code', '=', iso.toUpperCase()]]],
    { fields: ['id'], limit: 1 },
  );
  return rows[0]?.id ?? null;
}

export interface CreatePartnerInput {
  name: string;
  email: string;
  phone?: string | null;
  street?: string | null;
  street2?: string | null;
  zip?: string | null;
  city?: string | null;
  countryName?: string | null;
  countryIso?: string | null;
  vat?: string | null;
  siret?: string | null;
  lang?: string | null; // ex. 'fr_FR' / 'en_US'
  isCompany?: boolean;
}

export interface CreatePartnerResult {
  partnerId: number;
  vatRejected: boolean;
}

/**
 * Crée un res.partner. Si Odoo refuse le VAT (TVA invalide, ex. échec VIES),
 * retry sans le champ vat et flag `vatRejected: true` pour que l'admin soit
 * averti dans l'UI. Port verbatim de find_or_create_partner L.1411-1425.
 */
export async function createPartner(
  input: CreatePartnerInput,
): Promise<CreatePartnerResult> {
  const data: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    is_company: !!input.isCompany,
  };
  if (input.phone) data.phone = input.phone;
  if (input.street) data.street = input.street;
  if (input.street2) data.street2 = input.street2;
  if (input.zip) data.zip = input.zip;
  if (input.city) data.city = input.city;
  if (input.vat) data.vat = input.vat;
  if (input.siret) data.company_registry = input.siret.replace(/\s+/g, '');
  if (input.lang) data.lang = input.lang;

  let countryId: number | null = null;
  if (input.countryIso) countryId = await findCountryIdByIso(input.countryIso);
  if (!countryId && input.countryName)
    countryId = await findCountryIdByName(input.countryName);
  if (countryId) data.country_id = countryId;

  try {
    const partnerId = await executeKw<number>('res.partner', 'create', [data]);
    return { partnerId, vatRejected: false };
  } catch (err) {
    const msg = (err as Error).message ?? '';
    const looksLikeVatError =
      input.vat && /\bvat\b|tva|numéro\s*vat/i.test(msg);
    if (!looksLikeVatError) throw err;
    console.warn(`TVA invalide « ${input.vat} » ignorée, création sans TVA.`);
    delete data.vat;
    const partnerId = await executeKw<number>('res.partner', 'create', [data]);
    return { partnerId, vatRejected: true };
  }
}

export interface CreateChildAddressInput {
  parentId: number;
  type: 'delivery' | 'invoice' | 'contact' | 'other';
  street?: string | null;
  street2?: string | null;
  zip?: string | null;
  city?: string | null;
  countryName?: string | null;
  countryIso?: string | null;
  email?: string | null;
  phone?: string | null;
  /** Vide par défaut sur les enfants (règle Oshibori, cf. _build_address_vals L.1299). */
  name?: string;
}

export async function createChildAddress(
  input: CreateChildAddressInput,
): Promise<number> {
  const data: Record<string, unknown> = {
    name: input.name ?? '',
    type: input.type,
    parent_id: input.parentId,
  };
  if (input.street) data.street = input.street;
  if (input.street2) data.street2 = input.street2;
  if (input.zip) data.zip = input.zip;
  if (input.city) data.city = input.city;
  if (input.email) data.email = input.email;
  if (input.phone) data.phone = input.phone;

  let countryId: number | null = null;
  if (input.countryIso) countryId = await findCountryIdByIso(input.countryIso);
  if (!countryId && input.countryName)
    countryId = await findCountryIdByName(input.countryName);
  if (countryId) data.country_id = countryId;

  return executeKw<number>('res.partner', 'create', [data]);
}

export interface FindOrCreatePartnerInput {
  // Identification
  email: string;
  phone?: string | null;
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  siret?: string | null;
  vat?: string | null;
  lang?: string | null;

  // Adresses (la principale du partner = livraison ; facturation = enfant si différente)
  delivery: {
    street?: string | null;
    street2?: string | null;
    zip?: string | null;
    city?: string | null;
    countryName?: string | null;
    countryIso?: string | null;
    contactName?: string | null;
    carrierPhone?: string | null;
  };
  billing?: {
    street?: string | null;
    street2?: string | null;
    zip?: string | null;
    city?: string | null;
    countryName?: string | null;
    countryIso?: string | null;
  } | null;
}

export interface FindOrCreatePartnerResult {
  partnerId: number;
  created: boolean;
  isCompany: boolean;
  /** id du child delivery si créé, sinon undefined. */
  deliveryAddressId?: number;
  /** id du child invoice si créé, sinon undefined. */
  invoiceAddressId?: number;
  /** true si Odoo a refusé le VAT fourni et que le partner a été créé sans. */
  vatRejected?: boolean;
}

/**
 * Cherche un partner société par SIRET → VAT → téléphone → nom, puis crée
 * si introuvable. Pour les sociétés nouvellement créées, crée aussi les
 * enfants delivery (et invoice si distincte). Port verbatim de
 * gmail_to_odoo.find_or_create_partner L.1312-1456.
 */
export async function findOrCreatePartner(
  input: FindOrCreatePartnerInput,
): Promise<FindOrCreatePartnerResult> {
  const company = (input.companyName ?? '').trim();
  const siret = (input.siret ?? '').replace(/\s+/g, '');
  const vat = (input.vat ?? '').trim();
  const phone = (input.phone ?? '').trim();

  // ── Dédup société (ordre : SIRET → VAT → phone → nom) ─────────
  let existing: OdooPartner | null = null;
  if (siret) {
    existing = await searchCompanyPartner([
      ['company_registry', '=', siret],
      ['is_company', '=', true],
    ]);
  }
  if (!existing && vat) {
    existing = await searchCompanyPartner([
      ['vat', '=', vat],
      ['is_company', '=', true],
    ]);
  }
  if (!existing && phone) {
    existing = await searchCompanyPartner([
      ['phone', '=', phone],
      ['is_company', '=', true],
    ]);
  }
  if (!existing && company) {
    existing = await searchCompanyPartner([
      ['name', '=', company],
      ['is_company', '=', true],
    ]);
  }
  if (existing) {
    return { partnerId: existing.id, created: false, isCompany: true };
  }

  // ── Particulier ───────────────────────────────────────────────
  if (!company) {
    const created = await createPartner({
      name: `${input.firstName ?? ''} ${input.lastName ?? ''}`.trim() || input.email,
      email: input.email,
      phone: input.phone,
      lang: input.lang,
      isCompany: false,
      street: input.delivery.street,
      street2: input.delivery.street2,
      zip: input.delivery.zip,
      city: input.delivery.city,
      countryName: input.delivery.countryName,
      countryIso: input.delivery.countryIso,
    });
    return {
      partnerId: created.partnerId,
      created: true,
      isCompany: false,
      vatRejected: created.vatRejected,
    };
  }

  // ── Société + enfants delivery / invoice ──────────────────────
  const companyResult = await createPartner({
    name: company,
    email: input.email,
    phone: input.phone,
    vat,
    siret,
    lang: input.lang,
    isCompany: true,
    street: input.delivery.street,
    street2: input.delivery.street2,
    zip: input.delivery.zip,
    city: input.delivery.city,
    countryName: input.delivery.countryName,
    countryIso: input.delivery.countryIso,
  });
  const companyId = companyResult.partnerId;

  let deliveryAddressId: number | undefined;
  if (
    input.delivery.street ||
    input.delivery.zip ||
    input.delivery.city ||
    input.delivery.countryName ||
    input.delivery.countryIso
  ) {
    deliveryAddressId = await createChildAddress({
      parentId: companyId,
      type: 'delivery',
      name: input.delivery.contactName ?? '',
      street: input.delivery.street,
      street2: input.delivery.street2,
      zip: input.delivery.zip,
      city: input.delivery.city,
      countryName: input.delivery.countryName,
      countryIso: input.delivery.countryIso,
      email: input.email,
      phone: input.delivery.carrierPhone || input.phone,
    });
  }

  let invoiceAddressId: number | undefined;
  if (input.billing) {
    const sameAsDelivery =
      (input.billing.street ?? '').trim().toLowerCase() ===
        (input.delivery.street ?? '').trim().toLowerCase() &&
      (input.billing.zip ?? '').trim() === (input.delivery.zip ?? '').trim() &&
      (input.billing.city ?? '').trim().toLowerCase() ===
        (input.delivery.city ?? '').trim().toLowerCase();

    if (!sameAsDelivery) {
      invoiceAddressId = await createChildAddress({
        parentId: companyId,
        type: 'invoice',
        street: input.billing.street,
        street2: input.billing.street2,
        zip: input.billing.zip || input.delivery.zip, // zip_hint fallback (cf. Python)
        city: input.billing.city,
        countryName: input.billing.countryName,
        countryIso: input.billing.countryIso,
        email: input.email,
        phone: input.phone,
      });
    }
  }

  return {
    partnerId: companyId,
    created: true,
    isCompany: true,
    deliveryAddressId,
    invoiceAddressId,
    vatRejected: companyResult.vatRejected,
  };
}

// =====================================================
// Products (product.product)
// =====================================================

export interface OdooProductLite {
  id: number;
  name: string;
  default_code: string | false;
}

/**
 * List Oshibori-family sale products, optionally pre-filtered by a hint
 * substring matched against name OR default_code.
 */
export async function listOshiboriProducts(hint?: string): Promise<OdooProductLite[]> {
  const baseDomain: unknown[] = [['sale_ok', '=', true]];
  // Filter to Oshibori-related products only — broad OR
  baseDomain.push('|');
  baseDomain.push('|');
  baseDomain.push(['name', 'ilike', 'oshibori']);
  baseDomain.push(['default_code', '=ilike', 'PE%']);
  baseDomain.push(['default_code', '=ilike', 'OPP%']);

  if (hint) {
    baseDomain.unshift('&');
    baseDomain.push('|');
    baseDomain.push(['name', 'ilike', hint]);
    baseDomain.push(['default_code', 'ilike', hint]);
  }

  return executeKw<OdooProductLite[]>(
    'product.product',
    'search_read',
    [baseDomain],
    {
      fields: ['id', 'name', 'default_code'],
      limit: 100,
      order: 'default_code asc',
    },
  );
}

// =====================================================
// Sale order creation
// =====================================================

export interface CreateSaleOrderInput {
  partnerId: number;
  lines: Array<{ productId: number; quantity: number; description?: string }>;
  validityDate?: string; // YYYY-MM-DD
  clientOrderRef?: string;
  note?: string;
  fiscalPositionId?: number;
  companyId?: number;
  opportunityId?: number;
  partnerInvoiceId?: number;
  partnerShippingId?: number;
}

/**
 * Crée le sale.order PUIS chaque sale.order.line séparément.
 *
 * C'est volontaire et critique : si on passait `order_line: [[0,0,{...}]]`
 * inline dans le `sale.order.create`, Odoo NE DÉCLENCHE PAS les onchange
 * sur product_id → `price_unit` reste à 0 et `tax_ids` n'est pas appliqué.
 * Port verbatim du pattern Python (gmail_to_odoo.create_sale_order L.1715-1741).
 */
export async function createSaleOrder(
  input: CreateSaleOrderInput,
): Promise<OdooSaleOrder> {
  const data: Record<string, unknown> = {
    partner_id: input.partnerId,
    state: 'draft',
  };
  if (input.validityDate) data.validity_date = input.validityDate;
  if (input.clientOrderRef) data.client_order_ref = input.clientOrderRef;
  if (input.note) data.note = input.note;
  if (input.fiscalPositionId) data.fiscal_position_id = input.fiscalPositionId;
  if (input.companyId) data.company_id = input.companyId;
  if (input.opportunityId) data.opportunity_id = input.opportunityId;
  if (input.partnerInvoiceId) data.partner_invoice_id = input.partnerInvoiceId;
  if (input.partnerShippingId) data.partner_shipping_id = input.partnerShippingId;

  const newId = await executeKw<number>('sale.order', 'create', [data]);

  // Step 2 : crée chaque ligne séparément pour que Odoo déclenche les onchange
  // (price_unit depuis le pricelist, tax_ids depuis la fiscal_position).
  for (const line of input.lines) {
    const lineVals: Record<string, unknown> = {
      order_id: newId,
      product_id: line.productId,
      product_uom_qty: line.quantity,
    };
    if (line.description) lineVals.name = line.description;
    await executeKw<number>('sale.order.line', 'create', [lineVals]);
  }

  const created = await readSaleOrder(newId);
  if (!created) throw new Error(`sale.order ${newId} created but not readable`);
  return created;
}

// =====================================================
// Delivery / shipping — UPS via choose.delivery.carrier wizard
// Port verbatim de gmail_to_odoo.add_delivery_to_order :
//   1. sale.order.action_generate_order_packaging
//   2. choose.delivery.carrier.create({order_id, carrier_id})
//   3. choose.delivery.carrier.update_price → interroge UPS
//   4. choose.delivery.carrier.read → delivery_price
//   5. choose.delivery.carrier.button_confirm → ajoute la ligne
// =====================================================

// IDs Odoo des carriers cette instance (Oshibori). Voir delivery.carrier.
export const CARRIER_ID_EU = 15;       // UPS Standard DEVIS
export const CARRIER_ID_NON_EU = 21;   // Expedited Devis

export interface AttachDeliveryResult {
  carrierId: number;
  carrierName: string;
  deliveryPrice: number;
}

/**
 * Attache la ligne de transport au sale.order via le wizard
 * choose.delivery.carrier. Toute erreur Odoo / UPS est remontée verbatim
 * dans le message d'exception — l'admin doit pouvoir voir POURQUOI le
 * devis est bloqué (cf. bandeau "Erreur Odoo" sur la page admin).
 */
export async function attachDeliveryToOrder(
  orderId: number,
  isEu: boolean,
): Promise<AttachDeliveryResult> {
  const carrierId = isEu ? CARRIER_ID_EU : CARRIER_ID_NON_EU;
  const carrierName = isEu ? 'UPS Standard DEVIS' : 'Expedited Devis';
  const ctx = `${carrierName} (carrier_id=${carrierId})`;

  // 1. Génère les lignes de conditionnement. Non-fatal — certaines versions
  //    Odoo renvoient None et le wizard fonctionne aussi sans (cf. Python).
  try {
    await executeKw<unknown>('sale.order', 'action_generate_order_packaging', [[orderId]]);
  } catch (err) {
    console.warn('action_generate_order_packaging:', (err as Error).message);
  }

  // 2. Crée le wizard.
  let wizardId: number;
  try {
    wizardId = await executeKw<number>(
      'choose.delivery.carrier',
      'create',
      [{ order_id: orderId, carrier_id: carrierId }],
    );
  } catch (err) {
    throw new Error(
      `Impossible de créer le wizard transporteur ${ctx} : ${(err as Error).message}`,
    );
  }

  // 3. Demande le prix à UPS et le lit sur le wizard.
  let deliveryPrice: number;
  try {
    await executeKw<unknown>('choose.delivery.carrier', 'update_price', [[wizardId]]);
    const rows = await executeKw<Array<{ delivery_price: number | false }>>(
      'choose.delivery.carrier',
      'read',
      [[wizardId]],
      { fields: ['delivery_price'] },
    );
    deliveryPrice = Number(rows[0]?.delivery_price) || 0;
  } catch (err) {
    throw new Error(
      `L'API UPS n'a pas renvoyé de tarif (${ctx}) : ${(err as Error).message}`,
    );
  }

  // 4. Confirme → ajoute la ligne de transport sur la sale.order.
  //    Note : on confirme MÊME SI delivery_price=0 (port verbatim Python
  //    L.1670-1683 : "prix à renseigner manuellement"). La ligne existe
  //    et l'admin la complétera dans Odoo si besoin.
  try {
    await executeKw<unknown>('choose.delivery.carrier', 'button_confirm', [[wizardId]]);
  } catch (err) {
    throw new Error(
      `Impossible d'ajouter la ligne transport ${ctx} : ${(err as Error).message}`,
    );
  }

  return { carrierId, carrierName, deliveryPrice };
}

// =====================================================
// High-level orchestrator: fetch sale order + lines + ensure token
// =====================================================

export interface OdooSaleSnapshot {
  order: OdooSaleOrder;
  lines: OdooSaleOrderLine[];
  productLines: OdooSaleOrderLine[];
  deliveryLine: OdooSaleOrderLine | null;
  accessToken: string;
  portalUrl: string;
  pdfUrl: string;
  fetchedAt: string;
}

export async function fetchSaleOrderSnapshot(
  orderName: string,
): Promise<OdooSaleSnapshot | null> {
  const order = await findSaleOrderByName(orderName);
  if (!order) return null;

  const lines = await readSaleOrderLines(order.order_line);
  const accessToken = await ensureAccessToken(order.id, order.access_token);

  const productLines = lines.filter((l) => !l.is_delivery && l.display_type !== 'line_section' && l.display_type !== 'line_note');
  const deliveryLine = lines.find((l) => l.is_delivery) ?? null;

  return {
    order: { ...order, access_token: accessToken },
    lines,
    productLines,
    deliveryLine,
    accessToken,
    portalUrl: portalUrl(order.id, accessToken),
    pdfUrl: pdfUrl(order.id, accessToken),
    fetchedAt: new Date().toISOString(),
  };
}
