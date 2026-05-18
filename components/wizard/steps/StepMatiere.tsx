'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard } from '../PickCard';
import { useT } from '@/lib/i18n/Provider';
import type { Matiere } from '@/types/wizard';

export function StepMatiere() {
  const { state, pick: pickFromCtx } = useWizard();
  const { t } = useT();

  const select = (matiere: Matiere) => pickFromCtx({ matiere });

  return (
    <div className="space-y-8">
      <StepHeader title={t('matiere.title')} subtitle={t('matiere.subtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PickCard
          imageUrl="TODO"
          imageAlt={t('matiere.cotton')}
          title={t('matiere.cotton')}
          desc={t('matiere.cotton_desc')}
          selected={state.matiere === '100% Coton'}
          onClick={() => select('100% Coton')}
        />
        <PickCard
          imageUrl="TODO"
          imageAlt={t('matiere.bamboo')}
          title={t('matiere.bamboo')}
          desc={t('matiere.bamboo_desc')}
          ghostChips={[t('matiere.bamboo_extra')]}
          selected={state.matiere === '80% Bambou - 20% Coton'}
          onClick={() => select('80% Bambou - 20% Coton')}
        />
      </div>
    </div>
  );
}
