/**
 * Inline SVG icons partagés par les pastilles d'information des cartes
 * de sélection. Style Lucide-like : trait 1.6, lineCap=round,
 * lineJoin=round, viewBox 24, couleur héritée via `currentColor`.
 *
 * Toutes les icônes prennent une taille uniforme : 14×14 px par défaut.
 */

import type { SVGProps } from 'react';

const base = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function RulerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0L2.7 16.7a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z" />
      <path d="m7.5 10.5 2 2" />
      <path d="m10.5 7.5 2 2" />
      <path d="m13.5 4.5 2 2" />
      <path d="m4.5 13.5 2 2" />
    </svg>
  );
}

export function LayersIcon(props: SVGProps<SVGSVGElement>) {
  // « Plus épais » → 3 couches empilées
  return (
    <svg {...base} {...props}>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}

export function MinusIcon(props: SVGProps<SVGSVGElement>) {
  // « Plus fin » → trait simple
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function PackageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

export function LeafIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M11 20A7 7 0 0 1 4 13c0-3.5 2.5-7 8-9 1-.36 2 0 2 1 0 5 0 9-3 12a7 7 0 0 1 0 3Z" />
      <path d="M2 22c2-3 5-6 8-7" />
    </svg>
  );
}

export function MinimizeIcon(props: SVGProps<SVGSVGElement>) {
  // « Format compact » → deux flèches vers le centre
  return (
    <svg {...base} {...props}>
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="m14 10 7-7" />
      <path d="m3 21 7-7" />
    </svg>
  );
}

/** Drapeau français (3 bandes verticales) — utilisé sur Production française. */
export function FlagFrIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="5" width="6" height="14" fill="#0055A4" />
      <rect x="9" y="5" width="6" height="14" fill="#ffffff" />
      <rect x="15" y="5" width="6" height="14" fill="#EF4135" />
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        rx="1"
      />
    </svg>
  );
}

/** Récompense / certification — utilisé sur ISO 22716. */
export function AwardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="9" r="6" />
      <path d="m8.21 13.89-1.85 6 5.64-3.16 5.64 3.16-1.85-6.01" />
    </svg>
  );
}

/** Goutte d'eau — testé dermatologiquement. */
export function DropletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.7c2.5 3.2 7 7.4 7 12.3a7 7 0 1 1-14 0c0-4.9 4.5-9.1 7-12.3Z" />
    </svg>
  );
}

/** Sparkle — parfums signature. */
export function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="m5.6 5.6 2.1 2.1" />
      <path d="m16.3 16.3 2.1 2.1" />
      <path d="m5.6 18.4 2.1-2.1" />
      <path d="m16.3 7.7 2.1-2.1" />
    </svg>
  );
}

/** Calendrier / traçabilité — DLU 2 ans + lot tracé. */
export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}
