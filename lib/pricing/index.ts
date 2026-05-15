import type { PricingKey, QuantityRule, WizardState } from '@/types/wizard';
import { OPTIONS, PRICING, PRICING_PLATEAUX } from './data';

export { OPTIONS, PRICING, PRICING_PLATEAUX, PACKAGINGS, CDN } from './data';

// =====================================================
// Key derivation
// =====================================================

function gradeFromGrammage(g: string | null | undefined): '15g' | '10g' | '6g' | null {
  switch (g) {
    case '15 grammes': return '15g';
    case '10 grammes': return '10g';
    case '6 grammes':  return '6g';
    default: return null;
  }
}

export function pricingKey(state: WizardState): PricingKey | null {
  const l = state.persoLevel;
  const g = state.grammage ?? (state.category ?? '').replace(/^Oshibori Neutres /, '');
  const grade = gradeFromGrammage(g);
  if (!grade) return null;

  if (l === 'Neutre') {
    if (grade === '15g') {
      return state.packagingId === '15g-ecru-bambou' ? 'neutre/15g/bambou' : 'neutre/15g/coton';
    }
    return grade === '10g' ? 'neutre/10g' : 'neutre/6g';
  }
  if (l === 'Semi-perso') {
    if (grade === '15g') return 'semi/15g';
    if (grade === '10g') return 'semi/10g';
    return null;
  }
  if (l === 'Full perso') {
    if (grade === '15g') return 'full/15g';
    if (grade === '10g') return 'full/10g';
    return 'full/6g';
  }
  return null;
}

export function isPlateauxCategory(state: WizardState): boolean {
  return !!state.category && state.category.indexOf('Plateaux') === 0;
}

// =====================================================
// Unit pricing
// =====================================================

export function unitPriceForQuantity(state: WizardState, q: number | null): number | null {
  if (!q) return null;
  const key = pricingKey(state);
  if (!key) return null;
  const tiers = PRICING[key];
  let price = 0;
  for (const tier of tiers) if (q >= tier.min) price = tier.price;
  if (!price) return null;

  // Full perso 15g + Bambou matière
  if (
    state.persoLevel === 'Full perso' &&
    state.grammage === '15 grammes' &&
    state.matiere === '80% Bambou - 20% Coton'
  ) {
    price += OPTIONS.bambou15g;
  }
  if (state.greenFormula) price += OPTIONS.greenFormula;

  return price;
}

export function plateauxCartonPrice(q: number | null): number | null {
  const cartons = Math.floor((q ?? 0) / 48);
  if (!cartons) return null;
  let price = 0;
  for (const tier of PRICING_PLATEAUX) if (cartons >= tier.minCartons) price = tier.price;
  return price || null;
}

// =====================================================
// Quantity rule (conditionnement & bornes)
// =====================================================

export function quantityRule(state: WizardState): QuantityRule {
  const l = state.persoLevel;
  const g = state.grammage ?? (state.category ?? '').replace(/^Oshibori Neutres /, '');
  const isPlateaux = isPlateauxCategory(state);
  const is6g = g === '6 grammes' || (state.category?.includes('6 grammes') ?? false);
  const is15g = g === '15 grammes' || (state.category?.includes('15 grammes') ?? false);

  // Packaging hierarchy (2026 conditioning sheets) : Carton → Box (= 6 cartons) → Palette
  let multiple: number;
  let box: number | null;
  let pallet: number | null;
  let palletBoxes: number | null;

  if (isPlateaux) {
    multiple = 48; box = null; pallet = null; palletBoxes = null;
  } else if (is6g) {
    multiple = 100; box = 600; pallet = 12000; palletBoxes = 20;
  } else if (is15g) {
    multiple = 50; box = 300; pallet = 4800; palletBoxes = 16;
  } else {
    // 10g default
    multiple = 50; box = 300; pallet = 6000; palletBoxes = 20;
  }

  if (l === 'Neutre') {
    if (isPlateaux) {
      return {
        multiple, box, pallet, palletBoxes,
        min: 48, max: null,
        label: 'Plateaux 1×10 : multiple de 48 — un carton contient 48 plateaux.',
      };
    }
    const gCap = g ? g.charAt(0).toUpperCase() + g.slice(1) : '';
    return {
      multiple, box, pallet, palletBoxes,
      min: multiple, max: null,
      label: `${gCap} Neutres : multiple de ${multiple} Oshibori (${g} = ${multiple} Oshibori / carton).`,
    };
  }
  if (l === 'Semi-perso') {
    return {
      multiple, box, pallet, palletBoxes,
      min: 50, max: 17950,
      label: 'Semi Personnalisation : multiple de 50 Oshibori, entre 50 et 17 950 Oshibori.',
    };
  }
  if (l === 'Full perso') {
    if (is6g) {
      return {
        multiple, box, pallet, palletBoxes,
        min: 30000, max: null,
        label: 'Full Personnalisation 6 grammes : multiple de 100, à partir de 30 000 Oshibori.',
      };
    }
    return {
      multiple, box, pallet, palletBoxes,
      min: 18000, max: null,
      label: `Full Personnalisation ${g} : multiple de 50, à partir de 18 000 Oshibori.`,
    };
  }
  return { multiple: 1, box: null, pallet: null, palletBoxes: null, min: 1, max: null, label: '' };
}

// =====================================================
// Suggestions (paliers réels de la grille tarifaire)
// =====================================================

export function computeSuggestions(state: WizardState, r: QuantityRule): number[] {
  const lo = r.min;
  const hi = r.max;
  const isPlateaux = isPlateauxCategory(state);
  let tiers: number[] = [];
  if (isPlateaux) {
    tiers = PRICING_PLATEAUX.map((t) => t.minCartons * 48);
  } else {
    const key = pricingKey(state);
    if (key) tiers = PRICING[key].map((t) => t.min);
  }
  return tiers.filter((v) => v >= lo && (!hi || v <= hi));
}

// =====================================================
// Validation
// =====================================================

export interface QuantityValidation {
  ok: boolean;
  msg: string;
}

export function describePackaging(quantity: number, r: QuantityRule): string {
  if (!quantity) return '';
  let remaining = quantity;
  const parts: string[] = [];
  const fr = (n: number) => n.toLocaleString('fr-FR');

  if (r.pallet && remaining >= r.pallet) {
    const n = Math.floor(remaining / r.pallet);
    remaining -= n * r.pallet;
    parts.push(`${fr(n)} palette${n > 1 ? 's' : ''} de ${fr(r.pallet)} Oshibori`);
  }
  if (r.box && remaining >= r.box) {
    const n = Math.floor(remaining / r.box);
    remaining -= n * r.box;
    parts.push(`${fr(n)} carton${n > 1 ? 's' : ''} de ${r.box} Oshibori`);
  }
  if (remaining > 0) {
    const n = remaining / r.multiple;
    parts.push(`${fr(n)} carton${n > 1 ? 's' : ''} de ${r.multiple} Oshibori`);
  }
  return parts.join(' + ');
}

export function validateQuantity(state: WizardState): QuantityValidation {
  const r = quantityRule(state);
  const q = state.quantity ?? 0;
  if (!q || q < r.min) {
    return { ok: false, msg: `Minimum : ${r.min.toLocaleString('fr-FR')} Oshibori.` };
  }
  if (r.max && q > r.max) {
    return {
      ok: false,
      msg: `Maximum Semi Personnalisation : ${r.max.toLocaleString('fr-FR')} Oshibori. Au-delà, passez en Personnalisation Complète.`,
    };
  }
  if (q % r.multiple !== 0) {
    return { ok: false, msg: `La quantité doit être un multiple de ${r.multiple}.` };
  }
  return { ok: true, msg: `✓ ${describePackaging(q, r)}` };
}

// =====================================================
// Formatting
// =====================================================

export function formatEuro(v: number): string {
  return `${v.toFixed(2).replace('.', ',')} €`;
}

export function priceLabelForQuantity(state: WizardState, q: number | null): string {
  if (isPlateauxCategory(state)) {
    const p = plateauxCartonPrice(q);
    return p ? `${formatEuro(p)} / carton HT` : '';
  }
  const u = unitPriceForQuantity(state, q);
  return u ? `${formatEuro(u)} / unité HT` : '';
}

export function computeQuoteTotal(state: WizardState): { unitPrice: number | null; total: number | null } {
  const q = state.quantity ?? 0;
  if (!q) return { unitPrice: null, total: null };
  if (isPlateauxCategory(state)) {
    const cartonPrice = plateauxCartonPrice(q);
    if (cartonPrice == null) return { unitPrice: null, total: null };
    const cartons = Math.floor(q / 48);
    return { unitPrice: cartonPrice, total: cartonPrice * cartons };
  }
  const unit = unitPriceForQuantity(state, q);
  if (unit == null) return { unitPrice: null, total: null };
  return { unitPrice: unit, total: unit * q };
}
