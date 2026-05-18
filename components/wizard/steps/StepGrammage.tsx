'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard, type InfoChip } from '../PickCard';
import { ClientExamples } from '../ClientExamples';
import { CDN } from '@/lib/pricing/data';
import { useT } from '@/lib/i18n/Provider';
import { RulerIcon, LayersIcon, MinusIcon, MinimizeIcon } from '../icons';
import type { Grammage } from '@/types/wizard';

interface Option {
  value: Grammage;
  imgNeutre: string;
  imgSemi: string;
  imgFull: string;
  title: string;
  infoChips: InfoChip[];
  chip?: string;
}

export function StepGrammage() {
  const { state, pick } = useWizard();
  const { t } = useT();
  const isFull = state.persoLevel === 'Full perso';
  const isSemi = state.persoLevel === 'Semi-perso';

  const ALL: Option[] = [
    {
      value: '15 grammes',
      imgNeutre: `${CDN}Oshibori_15_grammes_2026.png?v=1765206540`,
      imgSemi: `${CDN}15gBlanc.png?v=1688637933`,
      imgFull: 'TODO',
      title: t('category_neutre.fifteen_g'),
      infoChips: [
        { icon: <RulerIcon />, label: t('category_neutre.dim_15_10'), variant: 'cream' },
        { icon: <LayersIcon />, label: t('category_neutre.thicker') },
      ],
      chip: t('grammage.from_18000'),
    },
    {
      value: '10 grammes',
      imgNeutre: `${CDN}10groshi.png?v=1765206540`,
      imgSemi: `${CDN}10gBlanc.png?v=1688722926`,
      imgFull: 'TODO',
      title: t('category_neutre.ten_g'),
      infoChips: [
        { icon: <RulerIcon />, label: t('category_neutre.dim_15_10'), variant: 'cream' },
        { icon: <MinusIcon />, label: t('category_neutre.thinner') },
      ],
      chip: t('grammage.from_18000'),
    },
    {
      value: '6 grammes',
      imgNeutre: `${CDN}6g.png?v=1765206540`,
      imgSemi: 'TODO',
      imgFull: 'TODO',
      title: t('category_neutre.six_g'),
      infoChips: [
        { icon: <RulerIcon />, label: t('category_neutre.dim_6'), variant: 'cream' },
        { icon: <MinimizeIcon />, label: t('category_neutre.compact') },
      ],
      chip: t('grammage.from_30000'),
    },
  ];

  const baseOptions = isSemi
    ? ALL.filter((o) => o.value === '15 grammes' || o.value === '10 grammes').map(
        (o) => ({ ...o, chip: t('grammage.from_50') }),
      )
    : ALL;

  const options = baseOptions.map((o) => ({
    ...o,
    img: isFull ? o.imgFull : isSemi ? o.imgSemi : o.imgNeutre,
  }));

  const subtitle = isFull ? t('grammage.subtitle_full') : t('grammage.subtitle_semi');

  return (
    <div className="space-y-8">
      <StepHeader title={t('grammage.title')} subtitle={subtitle} />

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
            infoChips={o.infoChips}
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
