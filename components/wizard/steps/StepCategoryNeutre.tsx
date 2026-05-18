'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard, type InfoChip } from '../PickCard';
import { CDN } from '@/lib/pricing/data';
import {
  LayersIcon,
  LeafIcon,
  MinimizeIcon,
  MinusIcon,
  PackageIcon,
  RulerIcon,
} from '../icons';

interface Variant {
  category: string;
  grammage: '15 grammes' | '10 grammes' | '6 grammes';
  img: string;
  title: string;
  chips: InfoChip[];
}

const VARIANTS: Variant[] = [
  {
    category: 'Oshibori Neutres 15 grammes',
    grammage: '15 grammes',
    img: `${CDN}Oshibori_15_grammes_2026.png?v=1765206540`,
    title: '15 grammes',
    chips: [
      { icon: <RulerIcon />, label: '22 × 22,5 cm' },
      { icon: <LayersIcon />, label: 'Plus épais' },
      { icon: <PackageIcon />, label: '6 emballages' },
      { icon: <LeafIcon />, label: 'Coton ou bambou' },
    ],
  },
  {
    category: 'Oshibori Neutres 10 grammes',
    grammage: '10 grammes',
    img: `${CDN}10groshi.png?v=1765206540`,
    title: '10 grammes',
    chips: [
      { icon: <RulerIcon />, label: '22 × 22,5 cm' },
      { icon: <MinusIcon />, label: 'Plus fin' },
      { icon: <PackageIcon />, label: '2 emballages' },
      { icon: <LeafIcon />, label: '100 % coton' },
    ],
  },
  {
    category: 'Oshibori Neutres 6 grammes',
    grammage: '6 grammes',
    img: `${CDN}6g.png?v=1765206540`,
    title: '6 grammes',
    chips: [
      { icon: <RulerIcon />, label: '19 × 18 cm' },
      { icon: <MinimizeIcon />, label: 'Format compact' },
      { icon: <LeafIcon />, label: '100 % coton' },
    ],
  },
];

export function StepCategoryNeutre() {
  const { state, pick } = useWizard();

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
            infoChips={v.chips}
            selected={state.category === v.category}
            onClick={() =>
              pick({
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
