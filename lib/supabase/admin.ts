import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service-role client — bypasses Row Level Security.
// IMPORTANT: only import in server-only code (route handlers, server actions).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
