import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/admin/check';
import { pdfUrl } from '@/lib/odoo/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Streams the Odoo-generated quote PDF to the authorised viewer.
 *
 * Authorisation rules:
 *   - The signed-in user's email must match the quote's email, OR
 *   - The signed-in user is an admin (allowlisted via ADMIN_EMAILS).
 *
 * The Odoo `access_token` is stored server-side; we don't expose it to the
 * client. The browser only sees /api/quotes/[id]/pdf.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'auth required' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: quote, error } = await admin
    .from('quotes')
    .select(
      'id, email, odoo_sale_order_id, odoo_access_token, quote_number',
    )
    .eq('id', id)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: 'quote not found' }, { status: 404 });
  }

  const emailMatch = quote.email.toLowerCase() === user.email.toLowerCase();
  if (!emailMatch && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (!quote.odoo_sale_order_id || !quote.odoo_access_token) {
    return NextResponse.json(
      { error: 'no Odoo link for this quote' },
      { status: 404 },
    );
  }

  const upstream = await fetch(
    pdfUrl(quote.odoo_sale_order_id, quote.odoo_access_token),
    { cache: 'no-store' },
  );
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Odoo PDF fetch failed (HTTP ${upstream.status})` },
      { status: 502 },
    );
  }

  const filename = `${quote.quote_number ?? 'devis'}.pdf`;
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
