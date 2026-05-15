'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard } from '../PickCard';
import { CDN } from '@/lib/pricing/data';
import type { PersoLevel } from '@/types/wizard';

const NEUTRE_IMG = `${CDN}Oshibori_15_grammes_2026.png?v=1765206540`;
const SEMI_IMG = `${CDN}oshiboriconceptsemiperso_dd364f87-3c4e-43f4-a5d0-33895f62ee93.png?v=1704812853`;
const FULL_IMG = `${CDN}Capture_d_ecran_2026-03-19_a_15.53.21.png?v=1773932013`;

export function StepPersoLevel() {
  const { state, set } = useWizard();

  const pick = (level: PersoLevel) =>
    set({
      persoLevel: level,
      // Reset downstream state when level changes
      category: null,
      grammage: null,
      matiere: null,
      packaging: null,
      packagingId: null,
    });

  return (
    <div className="space-y-8">
      <StepHeader
        title="Quel niveau de personnalisation&nbsp;?"
        subtitle="Stock neutre, votre logo, ou packaging entièrement sur mesure"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PickCard
          imageUrl={NEUTRE_IMG}
          imageAlt="Oshibori Neutres"
          title="Oshibori Neutres"
          desc="Notre gamme standard, prête à l'emploi, sans marquage."
          chips={['Stock disponible']}
          ghostChips={['Délai 3 jours ouvrés']}
          selected={state.persoLevel === 'Neutre'}
          onClick={() => pick('Neutre')}
        />
        <PickCard
          imageUrl={SEMI_IMG}
          imageAlt="Semi Personnalisation"
          title="Semi Personnalisation"
          desc="Votre logo apposé sur nos emballages existants. Impression manuelle, 15 ou 10 grammes."
          ghostChips={['MOQ 50 · Délai 15–20 jours']}
          selected={state.persoLevel === 'Semi-perso'}
          onClick={() => pick('Semi-perso')}
        />
        <PickCard
          imageUrl={FULL_IMG}
          imageAlt="Personnalisation Complète"
          title="Personnalisation Complète"
          desc="Emballage 100% sur mesure, matière et parfum au choix. Impression industrielle."
          ghostChips={['MOQ 18 000 · 30 000 pour 6 g']}
          selected={state.persoLevel === 'Full perso'}
          onClick={() => pick('Full perso')}
        />
      </div>
    </div>
  );
}
