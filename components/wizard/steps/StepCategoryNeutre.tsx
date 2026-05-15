'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard } from '../PickCard';
import { CDN } from '@/lib/pricing/data';

interface Variant {
  category: string;
  grammage: '15 grammes' | '10 grammes' | '6 grammes';
  img: string;
  title: string;
  desc: string;
  meta: string;
}

const VARIANTS: Variant[] = [
  {
    category: 'Oshibori Neutres 15 grammes',
    grammage: '15 grammes',
    img: `${CDN}Oshibori_15_grammes_2026.png?v=1765206540`,
    title: '15 grammes',
    desc: '22 × 22,5 cm · plus épais',
    meta: '6 emballages · coton ou bambou',
  },
  {
    category: 'Oshibori Neutres 10 grammes',
    grammage: '10 grammes',
    img: `${CDN}10groshi.png?v=1765206540`,
    title: '10 grammes',
    desc: '22 × 22,5 cm · plus fin',
    meta: '2 emballages · 100% coton',
  },
  {
    category: 'Oshibori Neutres 6 grammes',
    grammage: '6 grammes',
    img: `${CDN}6g.png?v=1765206540`,
    title: '6 grammes',
    desc: '19 × 18 cm · plus petit',
    meta: 'Format compact · 100% coton',
  },
];

export function StepCategoryNeutre() {
  const { state, set } = useWizard();

  return (
    <div className="space-y-8">
      <StepHeader
        title="Sélection du grammage"
        subtitle="Notre gamme Oshibori Neutres"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {VARIANTS.map((v) => (
          <PickCard
            key={v.category}
            imageUrl={v.img}
            imageAlt={v.title}
            title={v.title}
            desc={v.desc}
            meta={v.meta}
            selected={state.category === v.category}
            onClick={() =>
              set({
                category: v.category,
                grammage: v.grammage,
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
