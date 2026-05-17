import { describe, expect, it } from 'vitest';
import { normalizePhone } from './client';

describe('normalizePhone', () => {
  it('strip espaces, tirets, points, parenthèses', () => {
    expect(normalizePhone('06 31 59 95 00')).toBe('0631599500');
    expect(normalizePhone('06-31-59-95-00')).toBe('0631599500');
    expect(normalizePhone('06.31.59.95.00')).toBe('0631599500');
    expect(normalizePhone('(06) 31 59 95 00')).toBe('0631599500');
  });

  it('préserve le préfixe international +', () => {
    expect(normalizePhone('+33 6 31 59 95 00')).toBe('+33631599500');
    expect(normalizePhone('+1 (415) 555-0100')).toBe('+14155550100');
  });

  it('null / undefined / vide → null', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
    expect(normalizePhone('- - -')).toBeNull();
  });

  it('chaîne déjà normalisée passe inchangée', () => {
    expect(normalizePhone('0631599500')).toBe('0631599500');
    expect(normalizePhone('+33631599500')).toBe('+33631599500');
  });
});
