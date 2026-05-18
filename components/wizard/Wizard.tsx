'use client';

import { WizardProvider, useWizard } from './WizardProvider';
import { useDraftAutoSave } from './useDraftAutoSave';
import { ProgressBar } from './ProgressBar';
import { NavBar } from './NavBar';
import { WizardSidebar } from './WizardSidebar';
import { StepProfile } from './steps/StepProfile';
import { StepProductType } from './steps/StepProductType';
import { StepPersoLevel } from './steps/StepPersoLevel';
import { StepCategoryNeutre } from './steps/StepCategoryNeutre';
import { StepGrammage } from './steps/StepGrammage';
import { StepMatiere } from './steps/StepMatiere';
import { StepScent } from './steps/StepScent';
import { StepPackaging } from './steps/StepPackaging';
import { StepBrief } from './steps/StepBrief';
import { StepQuantity } from './steps/StepQuantity';
import { StepShipping } from './steps/StepShipping';
import { StepSummary } from './steps/StepSummary';

function WizardContent() {
  const { currentStep, state } = useWizard();
  // Auto-sauvegarde en brouillon dès qu'un email/téléphone/produit est
  // renseigné. Tourne sur toutes les étapes (pas juste le résumé).
  useDraftAutoSave(state);

  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      {/* Header sticky — toujours visible */}
      <header
        className="shrink-0 border-b border-[var(--qw-border-soft)] bg-white"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto max-w-3xl w-full px-4 sm:px-6 py-3 sm:py-5"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <a
              href="https://oshiboriconcept.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Oshibori Concept — site officiel"
              className="block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://oshiboriconcept.com/cdn/shop/files/oshiboriconcept-logo-1599554503_e03c2a56-3050-444f-871a-61225ec6cf3e.png"
                alt="Oshibori Concept"
                className="h-9 sm:h-12 w-auto"
              />
            </a>
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.08em] text-gold-dark">
              Devis personnalisé
            </span>
          </div>
          <ProgressBar />
        </div>
      </header>

      {/* Main scrollable area */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div
          className="mx-auto max-w-6xl w-full flex gap-6 lg:gap-10"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <div className="flex-1 min-w-0 max-w-3xl mx-auto lg:mx-0 lg:ml-auto px-4 sm:px-6 py-6 sm:py-10">
            {currentStep === 'profile' && <StepProfile />}
            {currentStep === 'product-type' && <StepProductType />}
            {currentStep === 'perso-level' && <StepPersoLevel />}
            {currentStep === 'category-neutre' && <StepCategoryNeutre />}
            {currentStep === 'grammage' && <StepGrammage />}
            {currentStep === 'matiere-full-15g' && <StepMatiere />}
            {currentStep === 'scenteur-full' && <StepScent />}
            {currentStep === 'packaging' && <StepPackaging />}
            {currentStep === 'brief' && <StepBrief />}
            {currentStep === 'quantity' && <StepQuantity />}
            {currentStep === 'shipping' && <StepShipping />}
            {currentStep === 'summary' && <StepSummary />}
          </div>
          <WizardSidebar />
        </div>
      </main>

      {/* Footer sticky — toujours visible */}
      <footer
        className="shrink-0 border-t border-[var(--qw-border-soft)] bg-white"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className="mx-auto max-w-3xl w-full px-4 sm:px-6 py-3 sm:py-4"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <NavBar />
        </div>
      </footer>
    </div>
  );
}

export function Wizard() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
