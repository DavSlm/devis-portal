import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const env = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    resend: !!process.env.RESEND_API_KEY,
    odoo_url: !!process.env.ODOO_URL,
    odoo_db: !!process.env.ODOO_DB,
    odoo_user: !!process.env.ODOO_USER,
    odoo_password: !!process.env.ODOO_PASSWORD,
    odoo_sync_token: !!process.env.ODOO_SYNC_TOKEN,
  };

  let supabase: { ok: boolean; counts?: Record<string, number | null>; error?: string };

  try {
    const client = createAdminClient();
    const tables = ['quote_requests', 'quotes', 'quote_actions'] as const;
    const counts: Record<string, number | null> = {};

    for (const table of tables) {
      const { count, error } = await client
        .from(table)
        .select('id', { count: 'exact', head: true });
      if (error) throw new Error(`${table}: ${error.message}`);
      counts[table] = count;
    }

    supabase = { ok: true, counts };
  } catch (err) {
    supabase = { ok: false, error: (err as Error).message };
  }

  return NextResponse.json({ env, supabase });
}
