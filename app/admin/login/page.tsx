'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [oauthPending, startOauthTransition] = useTransition();

  const handleGoogle = () => {
    setErrorMsg(null);
    startOauthTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
      }
      // On success Supabase redirects the browser; no further work here.
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin`,
        },
      });
      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
      } else {
        setStatus('sent');
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://oshiboriconcept.com/cdn/shop/files/oshiboriconcept-logo-1599554503_e03c2a56-3050-444f-871a-61225ec6cf3e.png"
            alt="Oshibori Concept"
            className="h-12 w-auto mx-auto"
          />
          <h1 className="text-xl font-semibold text-ink">Espace admin</h1>
        </div>

        {status === 'sent' ? (
          <div
            className="rounded-[var(--qw-card-radius)] border p-5 text-sm text-center"
            style={{
              background: 'var(--qw-cream)',
              borderColor: 'var(--qw-cream-strong)',
              color: 'var(--qw-gold-dark)',
            }}
          >
            <strong className="block mb-1">Vérifiez votre boîte mail</strong>
            <span className="text-ink-soft">
              Un lien de connexion vient d&apos;être envoyé à
              <br />
              <code className="text-ink">{email}</code>
            </span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Google SSO (méthode principale) ── */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={oauthPending}
              className="w-full py-3 rounded-[var(--qw-btn-radius)] border border-[var(--qw-border-soft)] bg-white hover:bg-[var(--qw-cream)] flex items-center justify-center gap-3 text-sm font-medium text-ink transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <GoogleIcon />
              {oauthPending ? 'Connexion…' : 'Continuer avec Google'}
            </button>

            {/* ── Séparateur ── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--qw-border-soft)]" />
              <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                ou
              </span>
              <div className="flex-1 h-px bg-[var(--qw-border-soft)]" />
            </div>

            {/* ── Fallback magic link (sera retiré quand Google sera validé) ── */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="qw-label">Lien magique par email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="qw-input"
                  placeholder="vous@oshibori-concept.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              {errorMsg && (
                <p className="text-sm text-[var(--qw-error)]">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={isPending || !email}
                className="w-full py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-medium text-ink-soft hover:text-ink border border-[var(--qw-border-soft)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isPending ? 'Envoi…' : 'Recevoir un lien magique'}
              </button>
            </form>

            <p className="text-xs text-center text-ink-soft">
              Seuls les emails autorisés peuvent accéder au dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
