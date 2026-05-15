'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard } from '../PickCard';
import { CDN } from '@/lib/pricing/data';
import type { Grammage } from '@/types/wizard';

interface Option {
  value: Grammage;
  img: string;
  title: string;
  desc: string;
  chip?: string;
}

const ALL: Option[] = [
  {
    value: '15 grammes',
    img: `${CDN}Oshibori_15_grammes_2026.png?v=1765206540`,
    title: '15 grammes',
    desc: '22 × 22,5 cm · plus épais',
    chip: 'À partir de 18 000 Oshibori',
  },
  {
    value: '10 grammes',
    img: `${CDN}10groshi.png?v=1765206540`,
    title: '10 grammes',
    desc: '22 × 22,5 cm · plus fin',
    chip: 'À partir de 18 000 Oshibori',
  },
  {
    value: '6 grammes',
    img: `${CDN}6g.png?v=1765206540`,
    title: '6 grammes',
    desc: '19 × 18 cm · plus petit',
    chip: 'À partir de 30 000 Oshibori',
  },
];

export function StepGrammage() {
  const { state, set } = useWizard();
  const isFull = state.persoLevel === 'Full perso';
  const isSemi = state.persoLevel === 'Semi-perso';

  // Semi only allows 15g and 10g; Full allows all three.
  const options = isSemi
    ? ALL.filter((o) => o.value === '15 grammes' || o.value === '10 grammes').map(
        (o) => ({ ...o, chip: 'À partir de 50 Oshibori' }),
      )
    : ALL;

  const subtitle = isFull
    ? 'Personnalisation Complète : trois formats au choix'
    : 'Semi Personnalisation : 15 ou 10 grammes';

  return (
    <div className="space-y-8">
      <StepHeader title="Sélection du grammage" subtitle={subtitle} />

      <div
        className={`grid grid-cols-1 gap-4 ${
          options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        {options.map((o) => (
          <PickCard
            key={o.value ?? 'unset'}
            imageUrl={o.img}
            imageAlt={o.title}
            title={o.title}
            desc={o.desc}
            ghostChips={o.chip ? [o.chip] : undefined}
            selected={state.grammage === o.value}
            onClick={() =>
              set({
                grammage: o.value,
                matiere: null,
                packaging: null,
                packagingId: null,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
