'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard } from '../PickCard';
import { CDN } from '@/lib/pricing/data';
import { useT } from '@/lib/i18n/Provider';

export function StepProductType() {
  const { state, pick } = useWizard();
  const { t } = useT();

  return (
    <div className="space-y-8">
      <StepHeader title={t('product_type.title')} subtitle={t('product_type.subtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PickCard
          imageUrl={`${CDN}Oshibori_15_grammes_2026.png?v=1765206540`}
          imageAlt={t('product_type.oshibori')}
          title={t('product_type.oshibori')}
          desc={t('product_type.oshibori_desc')}
          selected={state.productType === 'Oshibori'}
          onClick={() => pick({ productType: 'Oshibori', category: null })}
        />
        <PickCard
          imageUrl={`${CDN}plateaux10.webp?v=1703089738`}
          imageAlt={t('product_type.plateaux')}
          title={t('product_type.plateaux')}
          desc={t('product_type.plateaux_desc')}
          selected={state.productType === 'Plateaux'}
          onClick={() =>
            pick({
              productType: 'Plateaux',
              persoLevel: 'Neutre',
              category: 'Plateaux 1x10 Serviettes Sèches',
              packagingId: 'plateaux-10',
              packaging:
                'Plateau 1×10 Oshibori — Serviettes sèches · 80% bambou, 20% coton',
            })
          }
        />
      </div>
    </div>
  );
}
