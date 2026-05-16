'use client';

import { use, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { requestAccessOtp } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

type Step = 'email' | 'code';

export default function QuoteAccessPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requestPending, startRequest] = useTransition();
  const [verifyPending, startVerify] = useTransition();
  const [resentJustNow, setResentJustNow] = useState(false);

  const sendCode = (target: string) => {
    setErrorMsg(null);
    startRequest(async () => {
      await requestAccessOtp({ quoteId: id, email: target });
      setStep('code');
    });
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendCode(email.trim().toLowerCase());
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmedCode = code.replace(/\s/g, '');
    if (trimmedCode.length < 6) {
      setErrorMsg('Code trop court — vérifiez votre email.');
      return;
    }
    startVerify(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: trimmedCode,
        type: 'email',
      });
      if (error) {
        setErrorMsg(
          error.message.toLowerCase().includes('expired')
            ? 'Code expiré. Demandez-en un nouveau.'
            : error.message.toLowerCase().includes('invalid')
              ? 'Code incorrect. Vérifiez votre email et réessayez.'
              : `Erreur : ${error.message}`,
        );
        return;
      }
      router.replace(`/quotes/${id}`);
    });
  };

  const handleResend = () => {
    setCode('');
    setResentJustNow(false);
    sendCode(email.trim().toLowerCase());
    setResentJustNow(true);
    setTimeout(() => setResentJustNow(false), 4000);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-white px-4 py-12"
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
        paddingBottom: 'max(3rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://oshiboriconcept.com/cdn/shop/files/oshiboriconcept-logo-1599554503_e03c2a56-3050-444f-871a-61225ec6cf3e.png"
            alt="Oshibori Concept"
            className="h-12 w-auto mx-auto"
          />
          <h1 className="text-xl font-semibold text-ink">
            {step === 'email' ? 'Accéder à votre devis' : 'Entrez votre code'}
          </h1>
          <p className="text-sm text-ink-soft">
            {step === 'email'
              ? "Entrez l'email qui a reçu le devis pour recevoir un code d'accès."
              : `Code envoyé à `}
            {step === 'code' && (
              <code className="text-ink font-medium">{email}</code>
            )}
          </p>
        </div>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <label className="block">
              <span className="qw-label">Email</span>
              <input
                type="email"
                name="email"
                required
                autoFocus
                autoComplete="email"
                className="qw-input"
                placeholder="vous@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <button
              type="submit"
              disabled={requestPending || !email}
              className="w-full py-3 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {requestPending ? 'Envoi…' : "Recevoir mon code d'accès"}
            </button>

            <p className="text-xs text-center text-ink-soft">
              Si l&apos;email correspond à ce devis, vous recevrez votre code
              d&apos;accès dans quelques secondes.
            </p>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <label className="block">
              <span className="qw-label">Code reçu par email</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                maxLength={10}
                required
                autoFocus
                className="qw-input text-center text-2xl font-mono tracking-[0.4em]"
                placeholder="••••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
              />
            </label>

            {errorMsg && (
              <p className="text-sm text-[var(--qw-error)] text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={verifyPending || code.length < 6}
              className="w-full py-3 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {verifyPending ? 'Vérification…' : 'Accéder à mon devis'}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setErrorMsg(null);
                }}
                className="text-ink-soft hover:text-ink underline"
              >
                ← Changer d&apos;email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={requestPending}
                className="text-gold-dark hover:text-ink underline disabled:opacity-60"
              >
                {requestPending
                  ? 'Envoi…'
                  : resentJustNow
                    ? '✓ Code renvoyé'
                    : 'Renvoyer le code'}
              </button>
            </div>

            <p className="text-[11px] text-center text-ink-soft">
              Vous pouvez aussi cliquer sur le lien direct dans l&apos;email
              reçu — les deux fonctionnent.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
