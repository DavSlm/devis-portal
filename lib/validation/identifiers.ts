// Regex-only validation for SIRET and EU VAT numbers.
// Format-only — no API call against VIES or SIRENE.

export function isValidSiret(v: string): boolean {
  return /^\d{14}$/.test((v || '').replace(/\s/g, ''));
}

export function isValidVatFr(v: string): boolean {
  const clean = (v || '').replace(/\s/g, '').toUpperCase();
  return /^FR[A-HJ-NP-Z0-9]{2}\d{9}$/.test(clean);
}

export function isValidVatEu(v: string): boolean {
  const clean = (v || '').replace(/[\s.\-]/g, '').toUpperCase();
  return /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(clean);
}
