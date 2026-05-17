// =====================================================
// Mapping Wizard → Odoo product.product variant_id
// Porté depuis gmail_to_odoo/product_map.py (2026-05).
//
// Clés :
//   Neutre / Semi : (grammage, couleur, parfum) → variant_id
//   Full          : (grammage, serviette, parfum) → variant_id
//
// Défauts si non précisé : parfum="the blanc", serviette="coton",
// couleur="blanc".
// =====================================================

import type { WizardState } from '@/types/wizard';

export type PersoType = 'neutre' | 'semi' | 'full';
export type Grammage = '15g' | '10g' | '6g';
export type Couleur =
  | 'blanc'
  | 'noir'
  | 'silver'
  | 'bronze'
  | 'transparent'
  | 'ecru';
export type Serviette = 'coton' | 'bambou';
export type Parfum = 'the blanc' | 'the vert' | 'fleur oranger' | 'sans';

// ---- NEUTRE (product.template id=474) ----
const NEUTRE: Record<string, number> = {
  '15g|blanc|the blanc': 368,
  '15g|noir|the blanc': 365,
  '15g|silver|the blanc': 371,
  '15g|bronze|fleur oranger': 375,
  '15g|transparent|the blanc': 331,
  '15g|ecru|the blanc': 1429,

  '10g|noir|the vert': 352,
  '10g|blanc|the vert': 355,

  '6g|blanc|the blanc': 344,
};

// ---- SEMI PERSO (product.template id=487) ----
const SEMI: Record<string, number> = {
  '15g|blanc|the blanc': 287,
  '15g|noir|the blanc': 295,
  '15g|transparent|the blanc': 331,

  '10g|noir|the vert': 280,
  '10g|blanc|the blanc': 271,
};

// ---- FULL PERSO (product.template id=472) ----
const FULL: Record<string, number> = {
  // 15g coton
  '15g|coton|the blanc': 1465,
  '15g|coton|the vert': 1463,
  '15g|coton|fleur oranger': 1467,
  '15g|coton|sans': 1469,
  // 15g bambou
  '15g|bambou|the blanc': 1466,
  '15g|bambou|the vert': 1464,
  '15g|bambou|fleur oranger': 1468,
  '15g|bambou|sans': 1470,
  // 6g coton
  '6g|coton|the blanc': 1441,
  '6g|coton|the vert': 1439,
  '6g|coton|fleur oranger': 1443,
  '6g|coton|sans': 1445,
};

// ---- Plateaux ----
const PLATEAUX_VARIANT_ID = 1014; // PF perso / AREV (ajuster si SKU réel disponible)


// =====================================================
// Wizard-style options for the admin "Choose product" dropdown.
// The admin sees friendly labels — never Odoo product names —
// and we map to the Odoo variant_id internally.
// =====================================================

export type WizardProductGroup =
  | 'Neutre'
  | 'Semi-perso'
  | 'Full perso'
  | 'Plateaux';

export interface WizardProductOption {
  key: string;
  label: string;
  group: WizardProductGroup;
  variantId: number;
}

function labelCouleur(c: string): string {
  switch (c) {
    case 'blanc': return 'Blanc';
    case 'noir': return 'Noir';
    case 'silver': return 'Argent';
    case 'bronze': return 'Bronze';
    case 'transparent': return 'Transparent';
    case 'ecru': return 'Écru bambou';
    default: return c;
  }
}

function labelParfum(p: string): string {
  switch (p) {
    case 'the blanc': return 'Thé Blanc';
    case 'the vert': return 'Thé Vert';
    case 'fleur oranger': return "Fleur d'Oranger";
    case 'sans': return 'Sans parfum';
    default: return p;
  }
}

function labelServiette(s: string): string {
  return s === 'bambou' ? 'Bambou' : 'Coton';
}

function buildWizardOptions(): WizardProductOption[] {
  const out: WizardProductOption[] = [];

  // Neutre
  for (const [key, variantId] of Object.entries(NEUTRE)) {
    const [g, c, p] = key.split('|');
    out.push({
      key: `neutre|${g}|${c}|${p}`,
      label: `${g} · ${labelCouleur(c)} · ${labelParfum(p)}`,
      group: 'Neutre',
      variantId,
    });
  }

  // Semi
  for (const [key, variantId] of Object.entries(SEMI)) {
    const [g, c, p] = key.split('|');
    out.push({
      key: `semi|${g}|${c}|${p}`,
      label: `${g} · ${labelCouleur(c)} · ${labelParfum(p)}`,
      group: 'Semi-perso',
      variantId,
    });
  }

  // Full
  for (const [key, variantId] of Object.entries(FULL)) {
    const [g, s, p] = key.split('|');
    out.push({
      key: `full|${g}|${s}|${p}`,
      label: `${g} · ${labelServiette(s)} · ${labelParfum(p)}`,
      group: 'Full perso',
      variantId,
    });
  }

  out.push({
    key: 'plateaux',
    label: 'Plateaux 1×10 — Serviettes sèches',
    group: 'Plateaux',
    variantId: PLATEAUX_VARIANT_ID,
  });

  return out;
}

export const WIZARD_PRODUCT_OPTIONS: ReadonlyArray<WizardProductOption> =
  buildWizardOptions();

export function groupedWizardOptions(): Record<
  WizardProductGroup,
  WizardProductOption[]
> {
  const groups: Record<WizardProductGroup, WizardProductOption[]> = {
    Neutre: [],
    'Semi-perso': [],
    'Full perso': [],
    Plateaux: [],
  };
  for (const o of WIZARD_PRODUCT_OPTIONS) groups[o.group].push(o);
  return groups;
}

/** Resolve the Odoo product.product variant_id from a wizard option key
 *  (e.g. 'neutre|15g|blanc|the blanc'). */
export function variantIdFromWizardKey(key: string): number | null {
  const found = WIZARD_PRODUCT_OPTIONS.find((o) => o.key === key);
  return found?.variantId ?? null;
}

// =====================================================
// Inference helpers — same heuristics as product_map.py
// =====================================================

function detectGrammage(text: string): Grammage {
  const n = text.toLowerCase().replace(/\s/g, '');
  if (/6g(?!\d)|6gr|6gram/.test(n)) return '6g';
  if (/10g(?!\d)|10gr|10gram/.test(n)) return '10g';
  return '15g';
}

function detectCouleur(text: string): Couleur {
  const n = text.toLowerCase();
  if (/noir|black/.test(n)) return 'noir';
  if (/silver|argent/.test(n)) return 'silver';
  if (/bronze|gold|dor[ée]/.test(n)) return 'bronze';
  if (/transparent|clear|cristal/.test(n)) return 'transparent';
  if (/ecru|écru|bambou|bamboo|off[- ]?white/.test(n)) return 'ecru';
  return 'blanc';
}

function detectParfum(text: string): Parfum {
  const n = text.toLowerCase();
  if (/oranger|orange blossom/.test(n)) return 'fleur oranger';
  if (/vert|green tea/.test(n)) return 'the vert';
  if (/sans|unscent|no scent/.test(n)) return 'sans';
  return 'the blanc';
}

function detectServiette(state: WizardState, text: string): Serviette {
  if (state.matiere === '80% Bambou - 20% Coton') return 'bambou';
  return /bambou|bamboo/i.test(text) ? 'bambou' : 'coton';
}

// =====================================================
// Public API
// =====================================================

export interface ResolvedProduct {
  variantId: number;
  description: string;
  fallback: boolean;
}

/**
 * Resolve the Odoo product.product variant_id from a WizardState.
 * Returns the resolved id + a human-readable description.
 * If no exact match, falls back to the most generic variant in the same
 * category (blanc/the blanc) and sets `fallback: true`.
 */
export function resolveProductVariant(state: WizardState): ResolvedProduct | null {
  if (!state.productType) return null;

  // Plateaux short-circuit.
  if (state.productType === 'Plateaux') {
    return {
      variantId: PLATEAUX_VARIANT_ID,
      description: 'Plateaux 1x10 Serviettes Sèches',
      fallback: false,
    };
  }

  // Build a search string from the relevant fields so we can re-use the
  // same heuristics used by the Python script.
  const search = [
    state.persoLevel ?? '',
    state.grammage ?? '',
    state.matiere ?? '',
    state.packaging ?? '',
    state.scenteur ?? '',
  ]
    .join(' ')
    .trim();

  const persoLevel = state.persoLevel;
  const type: PersoType =
    persoLevel === 'Full perso' ? 'full' : persoLevel === 'Semi-perso' ? 'semi' : 'neutre';

  const grammage = detectGrammage(search);
  const parfum = detectParfum(search);

  if (type === 'full') {
    const serviette = detectServiette(state, search);
    const key = `${grammage}|${serviette}|${parfum}`;
    const variantId = FULL[key];
    if (variantId) {
      return {
        variantId,
        description: `Full perso ${grammage} ${serviette} ${parfum}`,
        fallback: false,
      };
    }
    const fb = FULL[`${grammage}|coton|the blanc`];
    if (fb) {
      return {
        variantId: fb,
        description: `Full perso ${grammage} coton the blanc (FALLBACK)`,
        fallback: true,
      };
    }
    return null;
  }

  const couleur = detectCouleur(search);
  const key = `${grammage}|${couleur}|${parfum}`;

  if (type === 'semi') {
    const variantId = SEMI[key];
    if (variantId) {
      return {
        variantId,
        description: `Semi perso ${grammage} ${couleur} ${parfum}`,
        fallback: false,
      };
    }
    const fb = SEMI[`${grammage}|blanc|the blanc`];
    if (fb) {
      return {
        variantId: fb,
        description: `Semi perso ${grammage} blanc the blanc (FALLBACK)`,
        fallback: true,
      };
    }
    return null;
  }

  // Neutre
  const variantId = NEUTRE[key];
  if (variantId) {
    return {
      variantId,
      description: `Neutre ${grammage} ${couleur} ${parfum}`,
      fallback: false,
    };
  }
  const fb = NEUTRE[`${grammage}|blanc|the blanc`];
  if (fb) {
    return {
      variantId: fb,
      description: `Neutre ${grammage} blanc the blanc (FALLBACK)`,
      fallback: true,
    };
  }
  return null;
}
