import type { WizardState } from '@/types/wizard';

// Step identifiers — every screen of the wizard.
// Order in computeFlow() determines navigation order; computeFlow may skip
// steps that don't apply given current state (e.g. matiere only for Full 15g).
export type StepId =
  | 'profile'
  | 'product-type'
  | 'perso-level'
  | 'category-neutre'
  | 'grammage'
  | 'matiere-full-15g'
  | 'packaging'
  | 'brief'
  | 'quantity'
  | 'shipping'
  | 'summary';

export function computeFlow(state: WizardState): StepId[] {
  const steps: StepId[] = ['profile', 'product-type'];

  if (state.productType === 'Oshibori') {
    steps.push('perso-level');

    if (state.persoLevel === 'Neutre') {
      // Pick the grammage variant (15g coton / 15g bambou / 10g / 6g) via category cards.
      steps.push('category-neutre', 'packaging');
    } else if (state.persoLevel === 'Semi-perso') {
      // Choose 15g or 10g, then packaging.
      steps.push('grammage', 'packaging', 'brief');
    } else if (state.persoLevel === 'Full perso') {
      steps.push('grammage');
      if (state.grammage === '15 grammes') steps.push('matiere-full-15g');
      steps.push('brief');
    }
  } else if (state.productType === 'Plateaux') {
    // Plateaux is a neutral product with a single SKU — straight to quantity.
  }

  steps.push('quantity', 'shipping', 'summary');
  return steps;
}

// Returns true if the user can leave the given step (Suivant button enabled).
export function canAdvance(step: StepId, state: WizardState): boolean {
  switch (step) {
    case 'profile':
      if (!state.profile) return false;
      if (state.profile === 'professionnel' && !state.entrepriseName.trim()) return false;
      return !!(
        state.firstName.trim() &&
        state.lastName.trim() &&
        /\S+@\S+\.\S+/.test(state.email) &&
        state.phone.trim() &&
        (state.profile === 'particulier' || state.country)
      );

    case 'product-type':
      return !!state.productType;

    case 'perso-level':
      return !!state.persoLevel;

    case 'category-neutre':
      return !!state.category;

    case 'grammage':
      return !!state.grammage;

    case 'matiere-full-15g':
      return !!state.matiere;

    case 'packaging':
      return !!state.packagingId;

    case 'brief':
      // Required only if no file uploaded.
      return !!state.fileName || state.brief.trim().length >= 5;

    case 'quantity':
      return !!state.quantity && state.quantity > 0;

    case 'shipping':
      return !!(
        state.deliveryStreet1.trim() &&
        state.deliveryPostalCode.trim() &&
        state.deliveryCity.trim() &&
        state.deliveryCountry.trim()
      );

    case 'summary':
      return true;

    default:
      return false;
  }
}

// Human-readable label for the progress bar / step header.
export const STEP_LABELS: Record<StepId, string> = {
  profile: 'Profil',
  'product-type': 'Produit',
  'perso-level': 'Personnalisation',
  'category-neutre': 'Variante',
  'grammage': 'Grammage',
  'matiere-full-15g': 'Matière',
  packaging: 'Emballage',
  brief: 'Brief',
  quantity: 'Quantité',
  shipping: 'Livraison',
  summary: 'Récapitulatif',
};
