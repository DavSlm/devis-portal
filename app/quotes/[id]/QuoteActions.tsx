'use client';

import { useState, useTransition } from 'react';
import { acceptQuote, rejectQuote } from './actions';

interface Props {
  quoteId: string;
  disabled?: boolean;
}

export function QuoteActions({ quoteId, disabled }: Props) {
  const [isRejectOpen, setRejectOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(() => {
      const fd = new FormData();
      fd.append('id', quoteId);
      acceptQuote(fd);
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleAccept}
          disabled={disabled || isPending}
          className="py-4 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isPending ? 'Validation…' : '✓ Accepter le devis'}
        </button>
        <button
          type="button"
          onClick={() => setRejectOpen(true)}
          disabled={disabled || isPending}
          className="py-4 rounded-[var(--qw-btn-radius)] text-sm font-medium border border-[var(--qw-border-soft)] hover:border-[var(--qw-error)] hover:text-[var(--qw-error)] transition-colors"
        >
          Refuser
        </button>
      </div>
      <p className="text-[11px] text-ink-soft text-center mt-3">
        En acceptant, vous confirmez votre commande aux conditions ci-dessus.
      </p>

      {isRejectOpen && (
        <RejectModal
          quoteId={quoteId}
          onClose={() => setRejectOpen(false)}
        />
      )}
    </>
  );
}

interface RejectModalProps {
  quoteId: string;
  onClose: () => void;
}

function RejectModal({ quoteId, onClose }: RejectModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(20, 20, 20, 0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        action={rejectQuote}
        className="bg-white rounded-[var(--qw-card-radius)] w-full max-w-md p-6 shadow-2xl space-y-4"
      >
        <input type="hidden" name="id" value={quoteId} />
        <header>
          <h2 className="text-lg font-semibold text-ink">Refuser ce devis</h2>
          <p className="text-sm text-ink-soft mt-1">
            Aidez-nous à comprendre pourquoi — c&apos;est optionnel mais précieux.
          </p>
        </header>
        <label className="block">
          <span className="qw-label">Raison ou commentaire</span>
          <textarea
            name="reason"
            rows={4}
            maxLength={1000}
            className="qw-input min-h-24"
            placeholder="Ex. budget, délai, configuration différente…"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[var(--qw-btn-radius)] text-sm text-ink-soft hover:text-ink transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-error)] hover:opacity-90 text-white transition-opacity"
          >
            Confirmer le refus
          </button>
        </div>
      </form>
    </div>
  );
}
