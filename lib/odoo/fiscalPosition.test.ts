import { describe, expect, it } from 'vitest';
import {
  countryNameToIso,
  getFiscalPositionId,
  isEuCountry,
  isEuTransportCountry,
} from './fiscalPosition';

describe('countryNameToIso', () => {
  it('ISO 2 lettres direct passe', () => {
    expect(countryNameToIso('FR')).toBe('FR');
    expect(countryNameToIso('be')).toBe('BE');
  });

  it('Nom français reconnu', () => {
    expect(countryNameToIso('France')).toBe('FR');
    expect(countryNameToIso('Belgique')).toBe('BE');
    expect(countryNameToIso('Allemagne')).toBe('DE');
  });

  it('Nom anglais reconnu', () => {
    expect(countryNameToIso('Germany')).toBe('DE');
    expect(countryNameToIso('united states')).toBe('US');
  });

  it('Pays inconnu → ""', () => {
    expect(countryNameToIso('Mordor')).toBe('');
  });

  it('Null / undefined → ""', () => {
    expect(countryNameToIso(null)).toBe('');
    expect(countryNameToIso(undefined)).toBe('');
  });
});

describe('getFiscalPositionId', () => {
  it('Livraison FR → toujours Domestique France (id=1) même si billing étranger', () => {
    expect(getFiscalPositionId('DE', 'FR', false)).toBe(1);
    expect(getFiscalPositionId('US', 'FR', false)).toBe(1);
    expect(getFiscalPositionId('FR', 'FR', true)).toBe(1);
  });

  it('Billing FR → Domestique France', () => {
    expect(getFiscalPositionId('FR', 'BE', false)).toBe(1);
  });

  it('Monaco / Suisse / UAE → IDs dédiés', () => {
    expect(getFiscalPositionId('MC', 'MC', false)).toBe(13);
    expect(getFiscalPositionId('CH', 'CH', false)).toBe(4);
    expect(getFiscalPositionId('AE', 'AE', false)).toBe(5);
  });

  it('US / Canada → 66', () => {
    expect(getFiscalPositionId('US', 'US', false)).toBe(66);
    expect(getFiscalPositionId('CA', 'CA', false)).toBe(66);
  });

  it('EU B2B (avec VAT) → 3', () => {
    expect(getFiscalPositionId('DE', 'DE', true)).toBe(3);
    expect(getFiscalPositionId('IT', 'IT', true)).toBe(3);
  });

  it('EU B2C (sans VAT) → 2', () => {
    expect(getFiscalPositionId('DE', 'DE', false)).toBe(2);
    expect(getFiscalPositionId('IT', 'IT', false)).toBe(2);
  });

  it('Hors Europe → 65', () => {
    expect(getFiscalPositionId('TR', 'TR', false)).toBe(65);
    expect(getFiscalPositionId('ME', 'ME', false)).toBe(65);
  });
});

describe('isEuCountry vs isEuTransportCountry', () => {
  it('isEuCountry : 27 UE strict', () => {
    expect(isEuCountry('FR')).toBe(true);
    expect(isEuCountry('DE')).toBe(true);
    expect(isEuCountry('GB')).toBe(false);
    expect(isEuCountry('CH')).toBe(false);
  });

  it('isEuTransportCountry : set étendu UPS (GB, CH, Balkans, UA, BY, MD inclus)', () => {
    expect(isEuTransportCountry('FR')).toBe(true);
    expect(isEuTransportCountry('GB')).toBe(true);
    expect(isEuTransportCountry('CH')).toBe(true);
    expect(isEuTransportCountry('NO')).toBe(true);
    expect(isEuTransportCountry('ME')).toBe(true);
    expect(isEuTransportCountry('UA')).toBe(true);
    expect(isEuTransportCountry('BY')).toBe(true);
    expect(isEuTransportCountry('MD')).toBe(true);
  });

  it('isEuTransportCountry : hors set → false', () => {
    expect(isEuTransportCountry('US')).toBe(false);
    expect(isEuTransportCountry('TR')).toBe(false);
    expect(isEuTransportCountry('JP')).toBe(false);
    expect(isEuTransportCountry('')).toBe(false);
    expect(isEuTransportCountry(null)).toBe(false);
  });
});
