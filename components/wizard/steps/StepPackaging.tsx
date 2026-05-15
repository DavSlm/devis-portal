'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard } from '../PickCard';
import { PACKAGINGS } from '@/lib/pricing/data';
import type { Packaging } from '@/types/wizard';

export function StepPackaging() {
  const { state, pick } = useWizard();

  let items: Packaging[] = [];
  let title = 'Emballage';
  let subtitle = 'Sélectionnez votre référence';

  if (state.persoLevel === 'Neutre' && state.category) {
    items = PACKAGINGS.neutre[state.category] ?? [];
    title = 'Emballage & parfum';
  } else if (state.persoLevel === 'Semi-perso' && state.grammage) {
    items = PACKAGINGS.semi[state.grammage] ?? [];
    title = 'Emballage à personnaliser';
    subtitle = 'Sur lequel souhaitez-vous appliquer votre marquage ?';
  }

  return (
    <div className="space-y-8">
      <StepHeader title={title} subtitle={subtitle} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <PickCard
            key={item.id}
            imageUrl={item.img || undefined}
            icon={item.img ? undefined : '◯'}
            imageAlt={item.label}
            title={item.label}
            desc={item.sub}
            ghostChips={item.note ? [item.note] : undefined}
            selected={state.packagingId === item.id}
            onClick={() =>
              pick({
                packagingId: item.id,
                packaging: `${item.label} — ${item.sub}`,
              })
            }
          />
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-center text-ink-soft text-sm">
          Aucun emballage disponible pour cette configuration.
        </p>
      )}
    </div>
  );
}
