'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard } from '../PickCard';

interface Scent {
  value: string;
  title: string;
  desc: string;
  /** TODO : image à fournir côté CDN. Tant que 'TODO', PickCard montre
   *  un placeholder "Image à venir". */
  img: string;
}

// Les valeurs envoyées sont alignées sur les mots-clés détectés par
// product_map.detect_parfum (lib/odoo/products.ts) — pas modifier sans
// vérifier le mapping variant.
const SCENTS: Scent[] = [
  {
    value: "Fleur d'oranger",
    title: "Fleur d'oranger",
    desc: 'Notes hespéridées, parfum signature haut de gamme.',
    img: 'TODO',
  },
  {
    value: 'Thé blanc',
    title: 'Thé blanc',
    desc: 'Notre signature historique, fraîche et délicate.',
    img: 'TODO',
  },
  {
    value: 'Thé vert',
    title: 'Thé vert',
    desc: 'Notes végétales, vivifiantes.',
    img: 'TODO',
  },
  {
    value: 'Sans parfum',
    title: 'Sans parfum',
    desc: 'Pour les profils sensibles ou les hôtels neutres.',
    img: 'TODO',
  },
];

export function StepScent() {
  const { state, pick } = useWizard();

  return (
    <div className="space-y-8">
      <StepHeader
        title="Choix du parfum"
        subtitle="Nos fragrances exclusives, signature haut de gamme"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SCENTS.map((s) => (
          <PickCard
            key={s.value}
            imageUrl={s.img}
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
