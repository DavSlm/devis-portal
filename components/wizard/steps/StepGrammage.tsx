'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard } from '../PickCard';
import { ClientExamples } from '../ClientExamples';
import { CDN } from '@/lib/pricing/data';
import type { Grammage } from '@/types/wizard';

interface Option {
  value: Grammage;
  /** Image utilisée en mode neutre (gamme catalogue actuelle). */
  imgNeutre: string;
  /** Image semi-perso — TODO : à fournir, montrer un emballage marqué. */
  imgSemi: string;
  /** Image full perso — TODO : à fournir, montrer un emballage 100% perso. */
  imgFull: string;
  title: string;
  desc: string;
  chip?: string;
}

const ALL: Option[] = [
  {
    value: '15 grammes',
    imgNeutre: `${CDN}Oshibori_15_grammes_2026.png?v=1765206540`,
    imgSemi: 'TODO',
    imgFull: 'TODO',
    title: '15 grammes',
    desc: '22 × 22,5 cm · plus épais',
    chip: 'À partir de 18 000 Oshibori',
  },
  {
    value: '10 grammes',
    imgNeutre: `${CDN}10groshi.png?v=1765206540`,
    imgSemi: 'TODO',
    imgFull: 'TODO',
    title: '10 grammes',
    desc: '22 × 22,5 cm · plus fin',
    chip: 'À partir de 18 000 Oshibori',
  },
  {
    value: '6 grammes',
    imgNeutre: `${CDN}6g.png?v=1765206540`,
    imgSemi: 'TODO',
    imgFull: 'TODO',
    title: '6 grammes',
    desc: '19 × 18 cm · plus petit',
    chip: 'À partir de 30 000 Oshibori',
  },
];

export function StepGrammage() {
  const { state, pick } = useWizard();
  const isFull = state.persoLevel === 'Full perso';
  const isSemi = state.persoLevel === 'Semi-perso';

  // Semi only allows 15g and 10g; Full allows all three.
  const baseOptions = isSemi
    ? ALL.filter((o) => o.value === '15 grammes' || o.value === '10 grammes').map(
        (o) => ({ ...o, chip: 'À partir de 50 Oshibori' }),
      )
    : ALL;

  // Sélectionne la bonne image selon le niveau de perso.
  const options = baseOptions.map((o) => ({
    ...o,
    img: isFull ? o.imgFull : isSemi ? o.imgSemi : o.imgNeutre,
  }));

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
              pick({
                grammage: o.value,
                matiere: null,
                packaging: null,
                packagingId: null,
              })
            }
          />
        ))}
      </div>

      {(isSemi || isFull) && (
        <ClientExamples variant={isFull ? 'full' : 'semi'} />
      )}
    </div>
  );
}
