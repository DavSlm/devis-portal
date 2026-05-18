// =====================================================
// Traduction des labels d'emballage (lib/pricing/data.ts).
// Les données restent en FR (canonique pour Odoo / state) et on
// localise à l'affichage seulement.
// =====================================================

import type { Locale } from './dictionary';
import type { Packaging } from '@/types/wizard';

const LABEL_EN: Record<string, string> = {
  'Emballage Blanc': 'White packaging',
  'Emballage Argent': 'Silver packaging',
  'Emballage Noir': 'Black packaging',
  'Emballage Transparent': 'Transparent packaging',
  'Emballage Bronze': 'Bronze packaging',
  'Emballage Ecru': 'Ecru packaging',
  'Plateau 1×10 Oshibori': '1×10 Oshibori Tray',
};

const SUB_EN: Record<string, string> = {
  'Parfum Thé Blanc · 100% coton': 'White tea fragrance · 100% cotton',
  'Parfum Thé Vert · 100% coton': 'Green tea fragrance · 100% cotton',
  'Parfum Thé Blanc · 80% bambou, 20% coton':
    'White tea fragrance · 80% bamboo, 20% cotton',
  "Parfum Fleur d'Oranger · 100% coton": 'Orange blossom fragrance · 100% cotton',
  'Parfum Thé Blanc': 'White tea fragrance',
  'Parfum Thé Vert': 'Green tea fragrance',
  'Serviettes sèches · 80% bambou, 20% coton': 'Dry towels · 80% bamboo, 20% cotton',
};

const NOTE_EN: Record<string, string> = {
  'Impression en encre blanche uniquement (logo et texte en blanc)':
    'White ink printing only (logo and text in white)',
};

export function localizePackaging(pkg: Packaging, locale: Locale): Packaging {
  if (locale === 'fr') return pkg;
  return {
    ...pkg,
    label: LABEL_EN[pkg.label] ?? pkg.label,
    sub: SUB_EN[pkg.sub] ?? pkg.sub,
    note: pkg.note ? NOTE_EN[pkg.note] ?? pkg.note : pkg.note,
  };
}
