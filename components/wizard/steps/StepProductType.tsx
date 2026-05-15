'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';

export function StepProductType() {
  const { state, set } = useWizard();

  return (
    <div className="space-y-8">
      <StepHeader
        title="Quel produit vous intéresse&nbsp;?"
        subtitle="Choisissez la gamme adaptée à votre projet"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProductCard
          icon="◔"
          title="Oshibori"
          desc="Serviettes rafraîchissantes individuelles, neutres ou personnalisées."
          selected={state.productType === 'Oshibori'}
          onClick={() => set({ productType: 'Oshibori', category: null })}
        />
        <ProductCard
          icon="⌷"
          title="Plateaux"
          desc="Plateaux 1×10 serviettes sèches, prêts à servir."
          selected={state.productType === 'Plateaux'}
          onClick={() =>
            set({
              productType: 'Plateaux',
              persoLevel: 'Neutre',
              category: 'Plateaux 1x10 Serviettes Sèches',
              packagingId: 'plateaux-10',
              packaging: 'Plateau 1×10 Oshibori — Serviettes sèches · 80% bambou, 20% coton',
            })
          }
        />
      </div>
    </div>
  );
}

interface ProductCardProps {
  icon: string;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}

function ProductCard({ icon, title, desc, selected, onClick }: ProductCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`qw-card-pick ${selected ? 'is-selected' : ''}`}
    >
      <span
        aria-hidden="true"
        className="text-3xl"
        style={{ color: 'var(--qw-gold-dark)' }}
      >
        {icon}
      </span>
      <span className="font-semibold text-ink">{title}</span>
      <span className="text-sm text-ink-soft">{desc}</span>
    </button>
  );
}
