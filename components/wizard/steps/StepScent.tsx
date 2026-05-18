'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard } from '../PickCard';
import { useT } from '@/lib/i18n/Provider';

export function StepScent() {
  const { state, pick } = useWizard();
  const { t } = useT();

  // Les valeurs (FR) sont alignées sur les mots-clés détectés par
  // product_map.detect_parfum (lib/odoo/products.ts) — ne pas modifier.
  const SCENTS = [
    {
      value: "Fleur d'oranger",
      title: t('scent.orange'),
      desc: t('scent.orange_desc'),
    },
    {
      value: 'Thé blanc',
      title: t('scent.white_tea'),
      desc: t('scent.white_tea_desc'),
    },
    {
      value: 'Thé vert',
      title: t('scent.green_tea'),
      desc: t('scent.green_tea_desc'),
    },
    {
      value: 'Sans parfum',
      title: t('scent.none'),
      desc: t('scent.none_desc'),
    },
  ];

  return (
    <div className="space-y-8">
      <StepHeader title={t('scent.title')} subtitle={t('scent.subtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SCENTS.map((s) => (
          <PickCard
            key={s.value}
            imageUrl="TODO"
            imageAlt={s.title}
            title={s.title}
            desc={s.desc}
            selected={state.scenteur === s.value}
            onClick={() => pick({ scenteur: s.value })}
          />
        ))}
      </div>
    </div>
  );
}
