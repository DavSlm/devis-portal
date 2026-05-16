// =====================================================
// Mapping pays → account.fiscal.position id Odoo.
// Porté depuis gmail_to_odoo._get_fiscal_position_id.
//
//   id=1 Domestique France
//   id=2 EU privé (B2C)
//   id=3 Intra-EU B2B
//   id=4 Suisse
//   id=5 UAE
//   id=13 Monaco
//   id=65 Hors Europe
//   id=66 Canada/USA
// =====================================================

const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);

export const FISCAL_POSITION_LABEL: Record<number, string> = {
  1: 'Domestique France',
  2: 'EU privé',
  3: 'Intra-EU B2B',
  4: 'Suisse',
  5: 'UAE',
  13: 'Monaco',
  65: 'Hors Europe',
  66: 'Canada/USA',
};

export function getFiscalPositionId(
  billingIso: string | null | undefined,
  deliveryIso: string | null | undefined,
  hasVat: boolean,
): number {
  const b = (billingIso ?? '').toUpperCase();
  const d = (deliveryIso ?? '').toUpperCase();

  // Livraison en France → TVA française quel que soit le pays de facturation.
  if (d === 'FR' || b === 'FR') return 1;
  if (b === 'MC') return 13;
  if (b === 'CH') return 4;
  if (b === 'US' || b === 'CA') return 66;
  if (b === 'AE') return 5;
  if (EU_COUNTRIES.has(b)) return hasVat ? 3 : 2;
  return 65;
}

// =====================================================
// Country name → ISO 3166-1 alpha-2 (subset commonly used).
// Used to translate wizard fields (which store full country names)
// to the ISO codes expected by getFiscalPositionId.
// =====================================================

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  // Français
  france: 'FR',
  belgique: 'BE',
  suisse: 'CH',
  allemagne: 'DE',
  italie: 'IT',
  espagne: 'ES',
  'royaume-uni': 'GB',
  'pays-bas': 'NL',
  portugal: 'PT',
  autriche: 'AT',
  luxembourg: 'LU',
  pologne: 'PL',
  'états-unis': 'US',
  'etats-unis': 'US',
  canada: 'CA',
  japon: 'JP',
  australie: 'AU',
  'émirats arabes unis': 'AE',
  'arabie saoudite': 'SA',
  qatar: 'QA',
  monaco: 'MC',
  maroc: 'MA',
  tunisie: 'TN',
  algérie: 'DZ',
  // English aliases
  germany: 'DE',
  italy: 'IT',
  spain: 'ES',
  switzerland: 'CH',
  belgium: 'BE',
  netherlands: 'NL',
  austria: 'AT',
  poland: 'PL',
  'united kingdom': 'GB',
  'united states': 'US',
  usa: 'US',
  'united arab emirates': 'AE',
};

export function countryNameToIso(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  // ISO direct (2 lettres)
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const iso = COUNTRY_NAME_TO_ISO[trimmed.toLowerCase()];
  return iso ?? '';
}

export function isEuCountry(iso: string | null | undefined): boolean {
  return EU_COUNTRIES.has((iso ?? '').toUpperCase());
}
