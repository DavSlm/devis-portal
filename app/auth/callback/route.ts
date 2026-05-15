import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles the magic-link redirect. Supabase appends ?code=...&next=...
// to the URL we passed as emailRedirectTo. We exchange the code for a session
// cookie and redirect to `next` (or /admin by default).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const rawNext = url.searchParams.get('next') ?? '/admin';
  // Only allow same-origin relative paths to prevent open-redirect attacks.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/admin';

  if (!code) {
    return NextResponse.redirect(new URL('/admin/login?error=missing_code', url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
