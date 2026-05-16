'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Client-side magic-link handler for quotes.
 *
 * Supabase returns the session either as:
 *   - PKCE flow: ?code=XXX in the query string (handled server-side)
 *   - Implicit flow: #access_token=...&refresh_token=... in the URL fragment
 *     (handled client-side, since fragments don't reach the server)
 *
 * This page tries both, sets the session, then redirects to the quote.
 */
export default function ClientQuoteAuth({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<'working' | 'error'>('working');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();

      // Implicit flow — tokens in the URL fragment.
      if (window.location.hash) {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        const errorDesc = hash.get('error_description') ?? hash.get('error');
        if (errorDesc) {
          setErrorMsg(errorDesc);
          setStatus('error');
          return;
        }
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            setErrorMsg(error.message);
            setStatus('error');
            return;
          }
          router.replace(`/quotes/${id}`);
          return;
        }
      }

      // PKCE flow — ?code=XXX in query string.
      const query = new URLSearchParams(window.location.search);
      const code = query.get('code');
      const errorDesc =
        query.get('error_description') ?? query.get('error');
      if (errorDesc) {
        setErrorMsg(errorDesc);
        setStatus('error');
        return;
      }
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setErrorMsg(error.message);
          setStatus('error');
          return;
        }
        router.replace(`/quotes/${id}`);
        return;
      }

      // Nothing usable — fall back to the access page.
      router.replace(`/quotes/${id}/access`);
    };

    run().catch((err) => {
      setErrorMsg((err as Error).message);
      setStatus('error');
    });
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-sm w-full text-center space-y-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://oshiboriconcept.com/cdn/shop/files/oshiboriconcept-logo-1599554503_e03c2a56-3050-444f-871a-61225ec6cf3e.png"
          alt="Oshibori Concept"
          className="h-10 w-auto mx-auto"
        />
        {status === 'working' && (
          <>
            <div
              className="mx-auto w-10 h-10 rounded-full border-2 border-[var(--qw-cream-strong)] border-t-[var(--qw-gold)]"
              style={{ animation: 'spin 0.8s linear infinite' }}
            />
            <p className="text-sm text-ink-soft">Connexion en cours…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-lg font-semibold text-ink">
              Lien invalide ou expiré
            </h1>
            {errorMsg && (
              <p className="text-xs text-[var(--qw-error)]">{errorMsg}</p>
            )}
            <a
              href={`/quotes/${id}/access`}
              className="inline-block mt-3 px-5 py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] text-white hover:bg-[var(--qw-gold-dark)] transition-colors"
            >
              Demander un nouveau lien
            </a>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
