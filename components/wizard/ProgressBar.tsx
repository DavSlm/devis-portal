'use client';

import { useWizard } from './WizardProvider';
import { STEP_LABELS } from './flow';
import { useT } from '@/lib/i18n/Provider';

export function ProgressBar() {
  const { currentIndex, totalSteps, currentStep } = useWizard();
  const { t } = useT();
  const pct = totalSteps > 1 ? ((currentIndex + 1) / totalSteps) * 100 : 100;

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs uppercase tracking-[0.08em] text-gold-dark font-semibold">
          {STEP_LABELS[currentStep]}
        </span>
        <span className="text-xs text-ink-soft">
          {t('sidebar.progress_step', { current: currentIndex + 1, total: totalSteps })}
        </span>
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--qw-border-soft)' }}
      >
        <div
          className="h-full transition-[width] duration-300 ease-in-out"
          style={{ width: `${pct}%`, background: 'var(--qw-gold)' }}
        />
      </div>
    </div>
  );
}
