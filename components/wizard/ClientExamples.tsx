'use client';

/**
 * Galerie d'exemples clients affichée sous la sélection de grammage en
 * mode Semi-perso ou Full perso. Les images sont des URLs CDN à
 * remplir par David — tant qu'elles valent 'TODO', un placeholder
 * « Image à venir » est rendu pour que la mise en page reste propre.
 *
 * Quand tu veux remplir les visuels :
 *  1. Uploade tes JPG/PNG sur le CDN Shopify (cf. les autres images)
 *  2. Remplace l'entrée correspondante dans EXAMPLES par l'URL.
 *  3. Ajuste `caption` si tu veux dire qui c'est ("Hôtel X · 15g full").
 */

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
  { img: 'TODO', caption: 'Exemple full perso 1' },
  { img: 'TODO', caption: 'Exemple full perso 2' },
  { img: 'TODO', caption: 'Exemple full perso 3' },
  { img: 'TODO', caption: 'Exemple full perso 4' },
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
