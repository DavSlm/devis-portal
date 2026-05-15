'use client';

import { WizardProvider, useWizard } from './WizardProvider';
import { ProgressBar } from './ProgressBar';
import { NavBar } from './NavBar';
import { StepProfile } from './steps/StepProfile';
import { StepProductType } from './steps/StepProductType';
import { StepPlaceholder } from './steps/StepPlaceholder';

function WizardContent() {
  const { currentStep } = useWizard();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-[var(--qw-border-soft)] bg-white">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold tracking-tight text-ink">
              Oshibori Concept
            </div>
            <span className="text-xs uppercase tracking-[0.08em] text-gold-dark">
              Devis personnalisé
            </span>
          </div>
          <ProgressBar />
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-10">
          {currentStep === 'profile' && <StepProfile />}
          {currentStep === 'product-type' && <StepProductType />}
          {currentStep !== 'profile' && currentStep !== 'product-type' && (
            <StepPlaceholder step={currentStep} />
          )}
        </div>
      </main>

      <footer className="bg-white sticky bottom-0">
        <div className="mx-auto max-w-3xl px-6 py-4">
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
