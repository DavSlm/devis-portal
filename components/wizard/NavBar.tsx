'use client';

import { useWizard } from './WizardProvider';

export function NavBar() {
  const { isFirst, isLast, canAdvance, next, prev } = useWizard();

  return (
    <nav className="flex items-center justify-between gap-3 pt-6 border-t border-[var(--qw-border-soft)]">
      <button
        type="button"
        onClick={prev}
        disabled={isFirst}
        className="px-5 py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ← Précédent
      </button>

      <button
        type="button"
        onClick={next}
        disabled={!canAdvance || isLast}
        className="px-6 py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)] disabled:bg-[var(--qw-cream-strong)] disabled:text-ink-soft disabled:shadow-none disabled:cursor-not-allowed transition-all"
      >
        {isLast ? 'Envoyer ma demande' : 'Suivant →'}
      </button>
    </nav>
  );
}
