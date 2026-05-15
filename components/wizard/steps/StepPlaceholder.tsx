'use client';

import { StepHeader } from './StepHeader';
import { STEP_LABELS, type StepId } from '../flow';

interface StepPlaceholderProps {
  step: StepId;
}

export function StepPlaceholder({ step }: StepPlaceholderProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        title={STEP_LABELS[step]}
        subtitle="Cette étape sera implémentée dans le prochain sous-sprint."
      />
      <div className="rounded-[var(--qw-card-radius)] border border-dashed border-[var(--qw-cream-strong)] bg-[var(--qw-cream)]/30 p-8 text-center text-ink-soft">
        <code className="text-xs">{step}</code>
      </div>
    </div>
  );
}
