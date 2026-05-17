import { NextResponse, type NextRequest } from 'next/server';
import { syncOdooOrderToQuote } from '@/lib/odoo/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Payload {
  quote_request_id?: string;
  odoo_order_name?: string;
}

/**
 * Triggered by the Python automation after it creates a sale.order in Odoo.
 *
 *   POST /api/odoo/sync
 *   Authorization: Bearer <ODOO_SYNC_TOKEN>
 *   {
 *     "quote_request_id": "<uuid>",
 *     "odoo_order_name": "S06736"
 *   }
 *
 * Pulls the order from Odoo, populates a `quotes` row (upsert by odoo_order_name),
 * marks the source request as `converted`, and sends the magic link to the client.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.ODOO_SYNC_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: 'ODOO_SYNC_TOKEN not configured on server' },
      { status: 500 },
    );
  }

  const auth = request.headers.get('authorization') ?? '';
  const provided = auth.replace(/^Bearer\s+/i, '');
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const requestId = (body.quote_request_id ?? '').trim();
  const odooOrderName = (body.odoo_order_name ?? '').trim();
  if (!requestId || !odooOrderName) {
    return NextResponse.json(
      { error: 'quote_request_id and odoo_order_name are required' },
      { status: 400 },
    );
  }

  try {
    const result = await syncOdooOrderToQuote({ requestId, odooOrderName });
    return NextResponse.json({
      ok: true,
      quote_id: result.quoteId,
      quote_number: result.quoteNumber,
      email_sent: result.emailSent,
      email_error: result.emailError ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
