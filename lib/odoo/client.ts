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
// Partners (res.partner)
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

export interface CreatePartnerInput {
  name: string;
  email: string;
  phone?: string | null;
  street?: string | null;
  street2?: string | null;
  zip?: string | null;
  city?: string | null;
  countryName?: string | null;
  vat?: string | null;
  isCompany?: boolean;
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

export async function createPartner(input: CreatePartnerInput): Promise<number> {
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
  if (input.countryName) {
    const countryId = await findCountryIdByName(input.countryName);
    if (countryId) data.country_id = countryId;
  }
  return executeKw<number>('res.partner', 'create', [data]);
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
}

export async function createSaleOrder(
  input: CreateSaleOrderInput,
): Promise<OdooSaleOrder> {
  const data: Record<string, unknown> = {
    partner_id: input.partnerId,
    state: 'draft',
  };
  // (0, 0, {fields}) — Odoo command tuple to create a new line.
  data.order_line = input.lines.map((l) => [
    0,
    0,
    {
      product_id: l.productId,
      product_uom_qty: l.quantity,
      ...(l.description ? { name: l.description } : {}),
    },
  ]);
  if (input.validityDate) data.validity_date = input.validityDate;
  if (input.clientOrderRef) data.client_order_ref = input.clientOrderRef;
  if (input.note) data.note = input.note;
  if (input.fiscalPositionId) data.fiscal_position_id = input.fiscalPositionId;
  if (input.companyId) data.company_id = input.companyId;

  const newId = await executeKw<number>('sale.order', 'create', [data]);

  const created = await readSaleOrder(newId);
  if (!created) throw new Error(`sale.order ${newId} created but not readable`);
  return created;
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
