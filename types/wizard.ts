// =====================================================
// Types du wizard — porté depuis contact-form-wizard.liquid
// =====================================================

export type Mode = 'devis' | null;
export type Profile = 'professionnel' | 'particulier' | null;
export type ProductType = 'Oshibori' | 'Plateaux' | null;
export type PersoLevel = 'Neutre' | 'Semi-perso' | 'Full perso' | null;
export type Grammage = '15 grammes' | '10 grammes' | '6 grammes' | null;
export type Matiere = '100% Coton' | '80% Bambou - 20% Coton' | null;

export interface WizardState {
  // Meta
  mode: Mode;
  profile: Profile;
  country: string | null;

  // Client identification
  entrepriseName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  siret: string;
  tvaFr: string;
  tvaUe: string;

  // Product configuration
  productType: ProductType;
  persoChoice: string | null;
  persoLevel: PersoLevel;
  category: string | null;
  grammage: Grammage;
  matiere: Matiere;
  packaging: string | null;
  packagingId: string | null;
  scenteur: string | null;

  // Brief
  brief: string;
  fileName: string;
  fileUrl?: string;
  attachmentFile: File | null;

  // Quantity + options
  quantity: number | null;
  greenFormula: boolean;

  // Shipping address
  deliveryContactName: string;
  deliveryStreet1: string;
  deliveryStreet2: string;
  deliveryPostalCode: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryCountry: string;

  // Billing address
  billingStreet1: string;
  billingStreet2: string;
  billingPostalCode: string;
  billingCity: string;
  billingCountry: string;
  billingSame: boolean;
  carrierPhone: string;

  // Free-text
  message: string;
}

export const initialState: WizardState = {
  mode: null,
  profile: null,
  country: null,
  entrepriseName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  siret: '',
  tvaFr: '',
  tvaUe: '',
  productType: null,
  persoChoice: null,
  persoLevel: null,
  category: null,
  grammage: null,
  matiere: null,
  packaging: null,
  packagingId: null,
  scenteur: null,
  brief: '',
  fileName: '',
  attachmentFile: null,
  quantity: null,
  greenFormula: false,
  deliveryContactName: '',
  deliveryStreet1: '',
  deliveryStreet2: '',
  deliveryPostalCode: '',
  deliveryCity: '',
  deliveryState: '',
  deliveryCountry: '',
  billingStreet1: '',
  billingStreet2: '',
  billingPostalCode: '',
  billingCity: '',
  billingCountry: '',
  billingSame: false,
  carrierPhone: '',
  message: '',
};

// =====================================================
// Pricing helpers shared with the engine
// =====================================================

export type PricingKey =
  | 'neutre/15g/coton'
  | 'neutre/15g/bambou'
  | 'neutre/10g'
  | 'neutre/6g'
  | 'semi/15g'
  | 'semi/10g'
  | 'full/15g'
  | 'full/10g'
  | 'full/6g';

export interface PricingTier {
  min: number;
  price: number;
}

export interface PlateauxTier {
  minCartons: number;
  price: number;
}

export interface Packaging {
  id: string;
  label: string;
  sub: string;
  pack: string;
  img: string;
  note?: string;
}

export interface QuantityRule {
  multiple: number;
  box: number | null;
  pallet: number | null;
  palletBoxes: number | null;
  min: number;
  max: number | null;
  label: string;
}
