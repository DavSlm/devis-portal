'use client';

/**
 * Galerie d'exemples clients affichée sous la sélection de grammage en
 * mode Semi-perso ou Full perso. Tant que `img === 'TODO'`, un
 * placeholder « Image à venir » est rendu pour que la mise en page
 * reste propre.
 *
 * Pour ajouter un nouvel exemple : upload l'image sur le CDN Shopify
 * (même bucket que les autres) puis push une entrée { img, caption }.
 */

import { CDN } from '@/lib/pricing/data';

interface Example {
  img: string;
  caption: string;
}

const EXAMPLES_SEMI: Example[] = [
  { img: 'TODO', caption: 'Exemple semi-perso 1' },
  { img: 'TODO', caption: 'Exemple semi-perso 2' },
  { img: 'TODO', caption: 'Exemple semi-perso 3' },
];

const EXAMPLES_FULL: Example[] = [
  { img: `${CDN}arev.png?v=1734850751`, caption: 'AREV' },
  { img: `${CDN}Air_senegal.png?v=1734850752`, caption: 'Air Sénégal' },
  { img: `${CDN}Rosewood_dae0ad50-8371-4347-8abd-f59c2f5ce056.png?v=1734850751`, caption: 'Rosewood' },
  { img: `${CDN}atlantis_the_royal.png?v=1711552312`, caption: 'Atlantis The Royal' },
  { img: `${CDN}mila_group.png?v=1711552360`, caption: 'Mila Group' },
  { img: `${CDN}peninsula.png?v=1711552611`, caption: 'Peninsula' },
];

export function ClientExamples({
  variant,
}: {
  variant: 'semi' | 'full';
}) {
  const items = variant === 'semi' ? EXAMPLES_SEMI : EXAMPLES_FULL;
  return (
    <section className="space-y-3 pt-4 border-t border-[var(--qw-cream-strong)]">
      <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-dark">
        Exemples de réalisations clients
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((ex, i) => (
          <figure
            key={i}
            className="space-y-1.5"
          >
            {ex.img === 'TODO' ? (
              <div
                className="aspect-square rounded-[var(--qw-input-radius)] flex items-center justify-center text-xs text-ink-soft"
                style={{
                  background: 'var(--qw-cream)',
                  border: '1px dashed var(--qw-cream-strong)',
                }}
              >
                Image à venir
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ex.img}
                alt={ex.caption}
                loading="lazy"
                className="aspect-square w-full object-cover rounded-[var(--qw-input-radius)] bg-white"
              />
            )}
            <figcaption className="text-[11px] text-ink-soft text-center">
              {ex.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
