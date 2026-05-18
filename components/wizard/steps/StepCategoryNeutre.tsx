'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard, type InfoChip } from '../PickCard';
import { CDN } from '@/lib/pricing/data';
import { useT } from '@/lib/i18n/Provider';
import {
  LayersIcon,
  LeafIcon,
  MinimizeIcon,
  MinusIcon,
  PackageIcon,
  RulerIcon,
} from '../icons';

export function StepCategoryNeutre() {
  const { state, pick } = useWizard();
  const { t } = useT();

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
      title: t('category_neutre.fifteen_g'),
      chips: [
        { icon: <RulerIcon />, label: t('category_neutre.dim_15_10'), variant: 'cream' },
        { icon: <LayersIcon />, label: t('category_neutre.thicker') },
        { icon: <PackageIcon />, label: t('category_neutre.six_packs') },
        { icon: <LeafIcon />, label: t('category_neutre.cotton_or_bamboo') },
      ],
    },
    {
      category: 'Oshibori Neutres 10 grammes',
      grammage: '10 grammes',
      img: `${CDN}10groshi.png?v=1765206540`,
      title: t('category_neutre.ten_g'),
      chips: [
        { icon: <RulerIcon />, label: t('category_neutre.dim_15_10'), variant: 'cream' },
        { icon: <MinusIcon />, label: t('category_neutre.thinner') },
        { icon: <PackageIcon />, label: t('category_neutre.two_packs') },
        { icon: <LeafIcon />, label: t('category_neutre.full_cotton') },
      ],
    },
    {
      category: 'Oshibori Neutres 6 grammes',
      grammage: '6 grammes',
      img: `${CDN}6g.png?v=1765206540`,
      title: t('category_neutre.six_g'),
      chips: [
        { icon: <RulerIcon />, label: t('category_neutre.dim_6'), variant: 'cream' },
        { icon: <MinimizeIcon />, label: t('category_neutre.compact') },
        { icon: <LeafIcon />, label: t('category_neutre.full_cotton') },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <StepHeader
        title={t('category_neutre.title')}
        subtitle={t('category_neutre.subtitle')}
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
