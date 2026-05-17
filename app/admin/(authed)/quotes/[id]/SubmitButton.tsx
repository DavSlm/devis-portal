'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

interface SubmitButtonProps {
  children: ReactNode;
  pendingLabel?: string;
  /** 'primary' (gold, fond plein) ou 'outline' (bordure gold). */
  variant?: 'primary' | 'outline';
  className?: string;
}

/**
 * Bouton submit qui passe en état "pending" pendant l'exécution de la
 * server action parente. Affiche un spinner + désactive le bouton →
 * l'admin ne peut pas double-cliquer ni naviguer ailleurs pendant que
 * createOdooDraftFromRequest / sendQuoteToClient s'exécutent (qui peuvent
 * prendre plusieurs secondes à cause des appels RPC Odoo + UPS + Resend).
 *
 * IMPORTANT: useFormStatus ne marche que pour le <form> parent direct.
 * Ce bouton doit donc être placé DANS le <form action={...}> qu'il
 * contrôle, pas en dehors.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  className = '',
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  const baseClasses =
    'w-full py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-semibold transition-all flex items-center justify-center gap-2';
  const variantClasses =
    variant === 'primary'
      ? 'bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)]'
      : 'border border-[var(--qw-gold)] text-gold-dark hover:bg-[var(--qw-gold-light)]';
  const disabledClasses = pending
    ? 'opacity-60 cursor-not-allowed pointer-events-none'
    : '';

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${baseClasses} ${variantClasses} ${disabledClasses} ${className}`}
    >
      {pending && <Spinner />}
      <span>{pending ? (pendingLabel ?? 'Traitement en cours…') : children}</span>
    </button>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'spin 0.8s linear infinite' }}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

/**
 * Overlay plein écran montré quand un form parent est en pending. Utile
 * sur les formulaires longs où on veut bloquer toute interaction
 * (créer le devis Odoo prend ~5-10s avec UPS).
 */
export function PendingOverlay({ message }: { message?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        pointerEvents: 'all',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          border: '4px solid rgba(184, 148, 86, 0.25)',
          borderTopColor: 'var(--qw-gold)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <div style={{ fontSize: 14, color: '#252525', fontWeight: 500 }}>
        {message ?? 'Traitement en cours…'}
      </div>
      <div style={{ fontSize: 12, color: '#888' }}>
        Ne ferme pas la page, ça peut prendre une dizaine de secondes.
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
