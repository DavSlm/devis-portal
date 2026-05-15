'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
          <p className="text-sm text-ink-soft">
            Connexion par lien magique envoyé sur votre email.
          </p>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="qw-label">Email</span>
              <input
                type="email"
                required
                autoFocus
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
              className="w-full py-3 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? 'Envoi…' : 'Recevoir mon lien de connexion'}
            </button>

            <p className="text-xs text-center text-ink-soft">
              Seuls les emails autorisés peuvent accéder au dashboard.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
