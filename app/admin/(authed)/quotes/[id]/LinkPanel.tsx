'use client';

import { useState, useTransition } from 'react';
import { regenerateClientLink } from './actions';

interface Props {
  requestId: string;
  quoteId?: string;
  emailOk: boolean;
  emailError?: string;
  magicLink?: string;
  clientEmail: string;
}

export function LinkPanel({
  requestId,
  quoteId,
  emailOk,
  emailError,
  magicLink,
  clientEmail,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCopy = async () => {
    if (!magicLink) return;
    try {
      await navigator.clipboard.writeText(magicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API might be blocked — fall back to manual selection.
    }
  };

  const handleRegenerate = () => {
    if (!quoteId) return;
    startTransition(() => {
      const fd = new FormData();
      fd.append('requestId', requestId);
      fd.append('quoteId', quoteId);
      regenerateClientLink(fd);
    });
  };

  return (
    <div
      className="rounded-[var(--qw-card-radius)] border p-5 space-y-4"
      style={{
        background: emailOk ? 'rgba(25, 135, 84, 0.06)' : 'var(--qw-cream)',
        borderColor: emailOk ? 'rgba(25, 135, 84, 0.25)' : 'var(--qw-cream-strong)',
      }}
    >
      <div>
        <h3
          className="font-semibold text-sm mb-1"
          style={{
            color: emailOk ? 'var(--qw-success)' : 'var(--qw-gold-dark)',
          }}
        >
          {emailOk
            ? `✓ Devis créé et envoyé à ${clientEmail}`
            : `Devis créé — l'envoi par email a échoué`}
        </h3>
        {!emailOk && emailError && (
          <p className="text-xs text-ink-soft">
            <strong className="text-[var(--qw-error)]">Erreur Resend :</strong>{' '}
            {emailError}
          </p>
        )}
        {!emailOk && (
          <p className="text-xs text-ink-soft mt-1">
            Le devis est bien enregistré. Copie le lien ci-dessous et envoie-le au
            client par le canal de ton choix (WhatsApp, email perso, etc.).
          </p>
        )}
      </div>

      {magicLink && (
        <div className="space-y-2">
          <label className="block">
            <span className="qw-label">Lien d&apos;accès direct (à transmettre)</span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={magicLink}
                className="qw-input flex-1 text-xs font-mono"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 rounded-[var(--qw-btn-radius)] text-xs font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white transition-colors whitespace-nowrap"
              >
                {copied ? '✓ Copié' : 'Copier'}
              </button>
            </div>
          </label>
          <p className="text-[11px] text-ink-soft">
            Ce lien est <strong>à usage unique</strong> et reste valide 24 h. Si le
            client ne le clique pas à temps, génère-en un nouveau.
          </p>
        </div>
      )}

      {quoteId && (
        <div className="pt-2 border-t border-[var(--qw-cream-strong)]">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isPending}
            className="text-xs uppercase tracking-[0.06em] text-gold-dark hover:text-ink disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Régénération…' : '↻ Générer un nouveau lien'}
          </button>
        </div>
      )}
    </div>
  );
}
