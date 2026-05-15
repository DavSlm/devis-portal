'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard } from '../PickCard';
import type { Matiere } from '@/types/wizard';

export function StepMatiere() {
  const { state, set } = useWizard();

  const pick = (matiere: Matiere) => set({ matiere });

  return (
    <div className="space-y-8">
      <StepHeader
        title="Serviette de votre choix"
        subtitle="Matière disponible sur Oshibori 15 grammes"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PickCard
          icon="◯"
          title="100% Coton"
          desc="Notre matière standard, douce et absorbante."
          selected={state.matiere === '100% Coton'}
          onClick={() => pick('100% Coton')}
        />
        <PickCard
          icon="◑"
          title="80% Bambou — 20% Coton"
          desc="Mélange premium, encore plus soft au toucher."
          ghostChips={['+ 0,10 € / unité']}
          selected={state.matiere === '80% Bambou - 20% Coton'}
          onClick={() => pick('80% Bambou - 20% Coton')}
        />
      </div>
    </div>
  );
}
