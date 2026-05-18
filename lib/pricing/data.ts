import type { Packaging, PlateauxTier, PricingKey, PricingTier } from '@/types/wizard';

// =====================================================
// PRICING — grille tarifaire 2026, prix HT unitaires EXW France
// Source : contact-form-wizard.liquid (2026-05)
// =====================================================
export const PRICING: Record<PricingKey, PricingTier[]> = {
  'neutre/15g/coton': [
    { min: 50,    price: 1.98 }, { min: 300,   price: 1.79 },
    { min: 1250,  price: 1.54 }, { min: 3000,  price: 1.44 },
    { min: 6000,  price: 1.36 },
  ],
  'neutre/15g/bambou': [
    { min: 50,    price: 2.13 }, { min: 300,   price: 1.93 },
    { min: 1250,  price: 1.68 }, { min: 3000,  price: 1.58 },
    { min: 6000,  price: 1.50 },
  ],
  'neutre/10g': [
    { min: 50,    price: 1.93 }, { min: 300,   price: 1.74 },
    { min: 1250,  price: 1.48 }, { min: 3000,  price: 1.39 },
    { min: 6000,  price: 1.31 },
  ],
  'neutre/6g': [
    { min: 100,   price: 1.69 }, { min: 600,   price: 1.53 },
    { min: 1200,  price: 1.33 }, { min: 3000,  price: 1.26 },
    { min: 6000,  price: 1.16 },
  ],
  'semi/15g': [
    { min: 50,    price: 2.19 }, { min: 300,   price: 1.99 },
    { min: 1250,  price: 1.89 }, { min: 3000,  price: 1.79 },
    { min: 6000,  price: 1.76 }, { min: 12000, price: 1.62 },
  ],
  'semi/10g': [
    { min: 50,    price: 2.04 }, { min: 300,   price: 1.94 },
    { min: 1250,  price: 1.84 }, { min: 3000,  price: 1.74 },
    { min: 6000,  price: 1.60 }, { min: 12000, price: 1.52 },
  ],
  'full/15g': [
    { min: 18000,  price: 0.99 }, { min: 54000,  price: 0.89 },
    { min: 150000, price: 0.84 }, { min: 250000, price: 0.79 },
  ],
  'full/10g': [
    { min: 18000,  price: 0.89 }, { min: 54000,  price: 0.84 },
    { min: 150000, price: 0.79 }, { min: 250000, price: 0.73 },
  ],
  'full/6g': [
    { min: 30000,  price: 0.73 }, { min: 50000,  price: 0.67 },
    { min: 150000, price: 0.62 }, { min: 250000, price: 0.56 },
  ],
};

// Plateaux : per-carton price (1 carton = 48 plateaux)
export const PRICING_PLATEAUX: PlateauxTier[] = [
  { minCartons: 1,   price: 5.80 },
  { minCartons: 10,  price: 5.50 },
  { minCartons: 105, price: 5.20 },
  { minCartons: 209, price: 4.90 },
];

// Per-Oshibori option premiums (Full perso only)
export const OPTIONS = {
  bambou15g: 0.10,    // matière Bambou/Coton sur 15g (vs coton)
  greenFormula: 0.05, // formule green d'origine naturelle (15g, 10g, 6g)
} as const;

// CDN base for product imagery (Shopify CDN)
export const CDN = 'https://cdn.shopify.com/s/files/1/0591/1917/3792/files/';

export const PACKAGINGS: {
  neutre: Record<string, Packaging[]>;
  semi: Record<string, Packaging[]>;
} = {
  neutre: {
    'Oshibori Neutres 15 grammes': [
      { id: '15g-blanc',       label: 'Emballage Blanc',       sub: 'Parfum Thé Blanc · 100% coton',            pack: 'blanc',       img: `${CDN}15gBlanc.webp?v=1768575069` },
      { id: '15g-argent',      label: 'Emballage Argent',      sub: 'Parfum Thé Blanc · 100% coton',            pack: 'argent',      img: `${CDN}15gArgent.webp?v=1703088628` },
      { id: '15g-noir',        label: 'Emballage Noir',        sub: 'Parfum Thé Blanc · 100% coton',            pack: 'noir',        img: `${CDN}15gNoir.webp?v=1703088447` },
      { id: '15g-transparent', label: 'Emballage Transparent', sub: 'Parfum Thé Blanc · 100% coton',            pack: 'transparent', img: `${CDN}15gClear.webp?v=1703088784` },
      { id: '15g-bronze',      label: 'Emballage Bronze',      sub: "Parfum Fleur d'Oranger · 100% coton",      pack: 'bronze',      img: `${CDN}15gBronze.png?v=1726229078` },
      { id: '15g-ecru-bambou', label: 'Emballage Ecru',        sub: 'Parfum Thé Blanc · 80% bambou, 20% coton', pack: 'ecru',        img: `${CDN}Oshibori_Off_White.jpg?v=1760428514` },
    ],
    'Oshibori Neutres 10 grammes': [
      { id: '10g-blanc-tv',    label: 'Emballage Blanc', sub: 'Parfum Thé Vert · 100% coton', pack: 'blanc', img: `${CDN}10gBlanc_b36e9d85-7027-4518-a96a-ffa9722e11db.webp?v=1703088823` },
      { id: '10g-noir-tv',     label: 'Emballage Noir',  sub: 'Parfum Thé Vert · 100% coton', pack: 'noir',  img: `${CDN}10gNoir_da1638c6-a882-4d69-bae6-cccef95cd74f.webp?v=1703088885` },
    ],
    'Oshibori Neutres 6 grammes': [
      { id: '6g-blanc', label: 'Emballage Blanc', sub: 'Parfum Thé Blanc · 100% coton', pack: 'blanc', img: `${CDN}6g.png?v=1765206540` },
    ],
    'Plateaux 1x10 Serviettes Sèches': [
      { id: 'plateaux-10', label: 'Plateau 1×10 Oshibori', sub: 'Serviettes sèches · 80% bambou, 20% coton', pack: 'blanc', img: `${CDN}plateaux10.webp?v=1703089738` },
    ],
  },
  semi: {
    '15 grammes': [
      { id: 'semi-15g-blanc',       label: 'Emballage Blanc',       sub: 'Parfum Thé Blanc', pack: 'blanc',       img: `${CDN}15gBlanc.png?v=1688637933` },
      { id: 'semi-15g-noir',        label: 'Emballage Noir',        sub: 'Parfum Thé Blanc', pack: 'noir',        img: `${CDN}15gNoir.png?v=1688640569`, note: 'Impression en encre blanche uniquement (logo et texte en blanc)' },
      { id: 'semi-15g-transparent', label: 'Emballage Transparent', sub: 'Parfum Thé Blanc', pack: 'transparent', img: `${CDN}oshiboripersoclear.png?v=1704818907` },
    ],
    '10 grammes': [
      { id: 'semi-10g-blanc-tb', label: 'Emballage Blanc', sub: 'Parfum Thé Blanc', pack: 'blanc', img: `${CDN}10gBlanc.png?v=1688722926` },
      { id: 'semi-10g-noir-tv',  label: 'Emballage Noir',  sub: 'Parfum Thé Vert',  pack: 'noir',  img: `${CDN}10gNoir.png?v=1688722925`, note: 'Impression en encre blanche uniquement (logo et texte en blanc)' },
    ],
  },
};
