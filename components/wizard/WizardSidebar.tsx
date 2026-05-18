'use client';

/**
 * Panneau latéral droit (desktop ≥lg uniquement) qui résume le devis
 * en cours : pour chaque étape on affiche son label + la valeur
 * sélectionnée (1 ligne tronquée). Les étapes déjà franchies sont
 * cliquables pour revenir en un clic.
 *
 * Mobile : caché (la ProgressBar en haut + le NavBar suffisent).
 */

import { useWizard } from './WizardProvider';
import { STEP_LABELS, type StepId } from './flow';
import type { WizardState } from '@/types/wizard';

function summaryFor(step: StepId, state: WizardState): string {
  switch (step) {
    case 'profile': {
      const name = `${state.firstName} ${state.lastName}`.trim();
      if (!state.profile) return '';
      if (state.profile === 'professionnel' && state.entrepriseName) {
        return name ? `${state.entrepriseName} · ${name}` : state.entrepriseName;
      }
      return name || 'Particulier';
    }
    case 'product-type':
      return state.productType ?? '';
    case 'perso-level':
      return state.persoLevel ?? '';
    case 'category-neutre':
      return state.category ?? '';
    case 'grammage':
      return state.grammage ?? '';
    case 'matiere-full-15g':
      return state.matiere ?? '';
    case 'scenteur-full':
      return state.scenteur ?? '';
    case 'packaging':
      return state.packaging || '';
    case 'brief':
      if (state.fileName) return state.fileName;
      if (state.brief.trim()) return 'Brief renseigné';
      return '';
    case 'quantity':
      return state.quantity
        ? `${state.quantity.toLocaleString('fr-FR')} unités`
        : '';
    case 'shipping': {
      const parts = [state.deliveryCity, state.deliveryCountry].filter(Boolean);
      return parts.join(', ');
    }
    case 'summary':
      return '';
  }
}

export function WizardSidebar() {
  const { flow, currentIndex, state, goTo } = useWizard();

  return (
    <aside
      aria-label="Progression du devis"
      className="hidden lg:block w-64 shrink-0 sticky top-0 self-start max-h-dvh overflow-y-auto py-10 pl-6 pr-2"
    >
      <h2 className="text-[11px] uppercase tracking-[0.08em] font-semibold text-gold-dark mb-4">
        Votre devis
      </h2>
      <ol className="space-y-3">
        {flow.map((step, idx) => {
          const status: 'done' | 'current' | 'upcoming' =
            idx < currentIndex ? 'done' : idx === currentIndex ? 'current' : 'upcoming';
          const summary = summaryFor(step, state);
          const clickable = idx <= currentIndex;
          const label = STEP_LABELS[step];

          return (
            <li key={step}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => goTo(step)}
                className={`w-full text-left flex items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors ${
                  status === 'current'
                    ? 'bg-[var(--qw-cream)]'
                    : clickable
                      ? 'hover:bg-[var(--qw-cream)]/50 cursor-pointer'
                      : 'cursor-default'
                }`}
              >
                <StatusIcon status={status} />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[11px] uppercase tracking-[0.05em] font-semibold leading-tight ${
                      status === 'upcoming' ? 'text-ink-soft/70' : 'text-ink'
                    }`}
                  >
                    {label}
                  </span>
                  <span
                    className={`block text-xs leading-snug truncate ${
                      status === 'current'
                        ? 'text-gold-dark font-medium'
                        : 'text-ink-soft'
                    }`}
                  >
                    {summary || (status === 'upcoming' ? '—' : '')}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function StatusIcon({ status }: { status: 'done' | 'current' | 'upcoming' }) {
  if (status === 'done') {
    return (
      <span
        aria-hidden="true"
        className="mt-0.5 w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        style={{ background: 'var(--qw-gold)' }}
      >
        ✓
      </span>
    );
  }
  if (status === 'current') {
    return (
      <span
        aria-hidden="true"
        className="mt-0.5 w-4 h-4 shrink-0 rounded-full flex items-center justify-center"
        style={{
          background: 'transparent',
          border: '2px solid var(--qw-gold)',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--qw-gold)' }}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 w-4 h-4 shrink-0 rounded-full"
      style={{ border: '1.5px solid var(--qw-cream-strong)' }}
    />
  );
}
