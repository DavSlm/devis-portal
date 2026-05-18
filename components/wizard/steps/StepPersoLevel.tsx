'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard } from '../PickCard';
import { CDN } from '@/lib/pricing/data';
import { useT } from '@/lib/i18n/Provider';
import type { PersoLevel } from '@/types/wizard';

const NEUTRE_IMG = `${CDN}Oshibori_15_grammes_2026.png?v=1765206540`;
const SEMI_IMG = `${CDN}oshiboriconceptsemiperso_dd364f87-3c4e-43f4-a5d0-33895f62ee93.png?v=1704812853`;
const FULL_IMG = `${CDN}Capture_d_ecran_2026-03-19_a_15.53.21.png?v=1773932013`;

export function StepPersoLevel() {
  const { state, pick } = useWizard();
  const { t } = useT();

  const select = (level: PersoLevel) =>
    pick({
      persoLevel: level,
      category: null,
      grammage: null,
      matiere: null,
      packaging: null,
      packagingId: null,
    });

  return (
    <div className="space-y-8">
      <StepHeader title={t('perso_level.title')} subtitle={t('perso_level.subtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PickCard
          imageUrl={NEUTRE_IMG}
          imageAlt={t('perso_level.neutre_title')}
          title={t('perso_level.neutre_title')}
          desc={t('perso_level.neutre_desc')}
          chips={[t('perso_level.neutre_chip_stock')]}
          ghostChips={[t('perso_level.neutre_chip_delay')]}
          selected={state.persoLevel === 'Neutre'}
          onClick={() => select('Neutre')}
        />
        <PickCard
          imageUrl={SEMI_IMG}
          imageAlt={t('perso_level.semi_title')}
          title={t('perso_level.semi_title')}
          desc={t('perso_level.semi_desc')}
          ghostChips={[t('perso_level.semi_chip')]}
          selected={state.persoLevel === 'Semi-perso'}
          onClick={() => select('Semi-perso')}
        />
        <PickCard
          imageUrl={FULL_IMG}
          imageAlt={t('perso_level.full_title')}
          title={t('perso_level.full_title')}
          desc={t('perso_level.full_desc')}
          ghostChips={[t('perso_level.full_chip')]}
          selected={state.persoLevel === 'Full perso'}
          onClick={() => select('Full perso')}
        />
      </div>
    </div>
  );
}
