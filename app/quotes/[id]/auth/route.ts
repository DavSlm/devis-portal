import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Client-side auth callback for quote magic links.
 *
 * Why a dedicated endpoint per quote instead of the generic /auth/callback?
 * Some Supabase Auth flows drop additional query params on the redirect_to
 * URL, so we can't rely on `?next=/quotes/[id]`. By baking the quote id into
 * the path we avoid the issue entirely: this route exchanges the code, then
 * redirects to the quote page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error_description') ?? url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/quotes/${id}/access?error=${encodeURIComponent(error)}`, url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL(`/quotes/${id}/access`, url.origin));
  }

  const supabase = await createClient();
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeErr) {
    return NextResponse.redirect(
      new URL(
        `/quotes/${id}/access?error=${encodeURIComponent(exchangeErr.message)}`,
        url.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(`/quotes/${id}`, url.origin));
}
