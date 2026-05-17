// =====================================================
// Port VERBATIM de gmail-odoo/product_map.py.
// Aucune dérive : mêmes maps, mêmes détecteurs (substring matching),
// même ordre d'évaluation, mêmes défauts, mêmes fallbacks.
//
// La string envoyée au résolveur est l'équivalent du
// `lookup_name = "{category} {shopify_product}"` côté Python — on
// concatène tous les champs du wizard susceptibles de contenir un
// mot-clé pertinent, et on délègue à detect_type / detect_* puis à la
// bonne table (PLATEAUX, FULL, SEMI, NEUTRE).
// =====================================================

import type { WizardState } from '@/types/wizard';

// ── NEUTRE (product.template id=474) ────────────────────────────
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

// ── SEMI PERSO (product.template id=487) ────────────────────────
const SEMI: Record<string, number> = {
  '15g|blanc|the blanc': 287,
  '15g|noir|the blanc': 295,
  '15g|transparent|the blanc': 331,
  '10g|noir|the vert': 280,
  '10g|blanc|the blanc': 271,
};

// ── FULL PERSO (product.template id=472) ────────────────────────
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

// ── PLATEAUX (oshiboris sèches, non emballées individuellement) ─
// Clé : taille du plateau. Carton = 48 plateaux dans tous les cas.
// Composition standard : 20% coton, 80% bambou.
const PLATEAUX: Record<string, number> = {
  '1x10': 627, // tmpl 701 — "Tray 1x10" — STANDARD, 5,80 €
  '1x4': 240,  // tmpl 485 — "Plateau 1x4"
  '1x5': 882,  // tmpl 956 — "Plateau 1x5"
  '1x12': 1120, // tmpl 1090 — "Plateau 1x12"
};

type PersoType = 'plateaux' | 'neutre' | 'semi' | 'full';
type Grammage = '6g' | '10g' | '15g';
type Couleur =
  | 'blanc'
  | 'noir'
  | 'silver'
  | 'bronze'
  | 'transparent'
  | 'ecru';
type Serviette = 'coton' | 'bambou';
type Parfum = 'the blanc' | 'the vert' | 'fleur oranger' | 'sans';

// =====================================================
// Détecteurs — port verbatim de product_map.py
// =====================================================

function detectType(name: string): PersoType {
  const n = name.toLowerCase();
  // Plateaux en priorité (peut contenir "oshibori" mais c'est un format distinct).
  if (
    ['plateau', 'tray', 'oshibori sec', 'oshibori sèche', 'dry oshibori', 'unwrapped'].some(
      (k) => n.includes(k),
    )
  ) {
    return 'plateaux';
  }
  if (
    ['full perso', 'full-perso', 'full personaliz', 'full personalis'].some((k) =>
      n.includes(k),
    )
  ) {
    return 'full';
  }
  if (
    ['semi perso', 'semi-perso', 'semi personaliz', 'semi personalis'].some((k) =>
      n.includes(k),
    )
  ) {
    return 'semi';
  }
  return 'neutre';
}

function detectPlateauSize(name: string): string {
  // Python: name.lower().replace(' ', '').replace('×', 'x') — espaces littéraux uniquement.
  const n = name.toLowerCase().replace(/ /g, '').replace(/×/g, 'x');
  for (const size of ['1x4', '1x5', '1x10', '1x12']) {
    if (n.includes(size)) return size;
  }
  return '1x10'; // format standard par défaut
}

function detectGrammage(name: string): Grammage {
  // Python: name.lower().replace(' ', '') — espaces littéraux uniquement.
  const n = name.toLowerCase().replace(/ /g, '');
  if (n.includes('6g') || n.includes('6gr') || n.includes('6gram')) return '6g';
  if (n.includes('10g') || n.includes('10gr') || n.includes('10gram')) return '10g';
  return '15g';
}

function detectCouleur(name: string): Couleur {
  const n = name.toLowerCase();
  if (['noir', 'black', 'noire'].some((k) => n.includes(k))) return 'noir';
  if (['silver', 'argent'].some((k) => n.includes(k))) return 'silver';
  if (['bronze', 'gold', 'or ', 'doré'].some((k) => n.includes(k))) return 'bronze';
  if (['transparent', 'clear', 'cristal'].some((k) => n.includes(k))) return 'transparent';
  if (
    ['ecru', 'écru', 'bambou', 'bamboo', 'off white', 'off-white', 'offwhite'].some(
      (k) => n.includes(k),
    )
  ) {
    return 'ecru';
  }
  return 'blanc';
}

function detectParfum(name: string): Parfum {
  const n = name.toLowerCase();
  if (['oranger', 'orange blossom', 'orange'].some((k) => n.includes(k)))
    return 'fleur oranger';
  if (['vert', 'green tea', 'green'].some((k) => n.includes(k))) return 'the vert';
  if (['sans', 'unscent', 'no scent', 'neutre parfum'].some((k) => n.includes(k)))
    return 'sans';
  return 'the blanc';
}

function detectServiette(name: string): Serviette {
  const n = name.toLowerCase();
  if (['bambou', 'bamboo'].some((k) => n.includes(k))) return 'bambou';
  return 'coton';
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
 * Port verbatim de product_map.resolve_variant_id(shopify_name).
 * Reçoit une string unique et retourne le variant_id + description
 * en appliquant exactement la même logique de détection et de fallback.
 */
export function resolveVariantFromName(name: string): ResolvedProduct | null {
  const ptype = detectType(name);

  if (ptype === 'plateaux') {
    const size = detectPlateauSize(name);
    const vid = PLATEAUX[size];
    if (vid) {
      return {
        variantId: vid,
        description: `Plateaux ${size}`,
        fallback: false,
      };
    }
    const fb = PLATEAUX['1x10'];
    return {
      variantId: fb,
      description: `Plateaux ${size} → FALLBACK 1x10`,
      fallback: true,
    };
  }

  const grammage = detectGrammage(name);
  const parfum = detectParfum(name);

  if (ptype === 'full') {
    const serviette = detectServiette(name);
    const key = `${grammage}|${serviette}|${parfum}`;
    const vid = FULL[key];
    if (vid) {
      return {
        variantId: vid,
        description: `Full perso ${grammage} ${serviette} ${parfum}`,
        fallback: false,
      };
    }
    const fb = FULL[`${grammage}|coton|the blanc`];
    if (fb) {
      return {
        variantId: fb,
        description: `Full perso ${grammage} ${serviette} ${parfum} → FALLBACK coton/thé blanc`,
        fallback: true,
      };
    }
    return null;
  }

  if (ptype === 'semi') {
    const couleur = detectCouleur(name);
    const key = `${grammage}|${couleur}|${parfum}`;
    const vid = SEMI[key];
    if (vid) {
      return {
        variantId: vid,
        description: `Semi perso ${grammage} ${couleur} ${parfum}`,
        fallback: false,
      };
    }
    const fb = SEMI[`${grammage}|blanc|the blanc`];
    if (fb) {
      return {
        variantId: fb,
        description: `Semi perso ${grammage} ${couleur} ${parfum} → FALLBACK blanc/thé blanc`,
        fallback: true,
      };
    }
    return null;
  }

  // neutre
  const couleur = detectCouleur(name);
  const key = `${grammage}|${couleur}|${parfum}`;
  const vid = NEUTRE[key];
  if (vid) {
    return {
      variantId: vid,
      description: `Neutre ${grammage} ${couleur} ${parfum}`,
      fallback: false,
    };
  }
  const fb = NEUTRE[`${grammage}|blanc|the blanc`];
  if (fb) {
    return {
      variantId: fb,
      description: `Neutre ${grammage} ${couleur} ${parfum} → FALLBACK blanc/thé blanc`,
      fallback: true,
    };
  }
  return null;
}

/**
 * Wrapper pour les WizardState. Construit un `lookup_name` équivalent à ce
 * que reçoit le script Python (category + product Shopify) en concaténant
 * tous les champs susceptibles de contenir un mot-clé pertinent, puis
 * délègue à resolveVariantFromName(). La détection plateaux est gérée en
 * interne par detect_type — pas de court-circuit séparé.
 */
export function resolveProductVariant(state: WizardState): ResolvedProduct | null {
  const lookupName = [
    state.productType,
    state.category,
    state.persoLevel,
    state.grammage,
    state.matiere,
    state.packaging,
    state.packagingId,
    state.scenteur,
  ]
    .filter((v) => v != null && v !== '')
    .join(' ');

  if (!lookupName) return null;
  return resolveVariantFromName(lookupName);
}
