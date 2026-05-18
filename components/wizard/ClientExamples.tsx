'use client';

/**
 * Carrousel horizontal d'exemples clients affiché sous la sélection de
 * grammage en mode Semi-perso ou Full perso. Scroll natif + scroll-snap
 * (pas de dépendance carousel). Compact : 96-112px de haut max pour ne
 * pas voler l'attention de la sélection principale.
 *
 * Pour ajouter un nouvel exemple : upload l'image sur le CDN Shopify
 * (même bucket que les autres) puis push une entrée { img }.
 */

import { useRef } from 'react';
import { CDN } from '@/lib/pricing/data';

interface Example {
  img: string;
}

const EXAMPLES_SEMI: Example[] = [
  { img: 'TODO' },
  { img: 'TODO' },
  { img: 'TODO' },
];

const EXAMPLES_FULL: Example[] = [
  { img: `${CDN}perso_207.webp?v=1693945029` },
  { img: `${CDN}perso_208.webp?v=1693945029` },
  { img: `${CDN}perso_202.webp?v=1693945029` },
  { img: `${CDN}perso_206.webp?v=1693945029` },
  { img: `${CDN}arev.png?v=1734850751` },
  { img: `${CDN}Air_senegal.png?v=1734850752` },
  { img: `${CDN}Rosewood_dae0ad50-8371-4347-8abd-f59c2f5ce056.png?v=1734850751` },
  { img: `${CDN}atlantis_the_royal.png?v=1711552312` },
  { img: `${CDN}mila_group.png?v=1711552360` },
  { img: `${CDN}peninsula.png?v=1711552611` },
];

export function ClientExamples({
  variant,
}: {
  variant: 'semi' | 'full';
}) {
  const items = variant === 'semi' ? EXAMPLES_SEMI : EXAMPLES_FULL;
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="space-y-2 pt-4 border-t border-[var(--qw-cream-strong)]">
      <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-dark">
        Exemples de réalisations clients
      </h3>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          {items.map((ex, i) => (
            <div
              key={i}
              className="snap-start shrink-0 w-24 sm:w-28"
            >
              {ex.img === 'TODO' ? (
                <div
                  className="aspect-square w-full rounded-[var(--qw-input-radius)] flex items-center justify-center text-[10px] text-ink-soft text-center px-1"
                  style={{
                    background: 'var(--qw-cream)',
                    border: '1px dashed var(--qw-cream-strong)',
                  }}
                >
                  À venir
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ex.img}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover rounded-[var(--qw-input-radius)] bg-white"
                />
              )}
            </div>
          ))}
        </div>

        {items.length > 4 && (
          <>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Précédent"
              className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 items-center justify-center rounded-full bg-white shadow border border-[var(--qw-cream-strong)] text-ink-soft hover:text-ink"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Suivant"
              className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 items-center justify-center rounded-full bg-white shadow border border-[var(--qw-cream-strong)] text-ink-soft hover:text-ink"
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}
