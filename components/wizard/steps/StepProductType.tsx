'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard } from '../PickCard';
import { CDN } from '@/lib/pricing/data';

export function StepProductType() {
  const { state, pick } = useWizard();

  return (
    <div className="space-y-8">
      <StepHeader
        title="Quel produit vous intéresse&nbsp;?"
        subtitle="Choisissez la gamme adaptée à votre projet"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PickCard
          imageUrl={`${CDN}Oshibori_15_grammes_2026.png?v=1765206540`}
          imageAlt="Oshibori"
          title="Oshibori"
          desc="Serviettes rafraîchissantes individuelles, neutres ou personnalisées."
          selected={state.productType === 'Oshibori'}
          onClick={() => pick({ productType: 'Oshibori', category: null })}
        />
        <PickCard
          imageUrl={`${CDN}plateaux10.webp?v=1703089738`}
          imageAlt="Plateaux 1×10"
          title="Plateaux"
          desc="Plateaux 1×10 serviettes sèches, prêts à servir."
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
