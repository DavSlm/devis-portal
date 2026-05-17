'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { WizardState } from '@/types/wizard';

const DRAFT_ID_KEY = 'oshibori-devis-draft-id';
const DEBOUNCE_MS = 1500;

/**
 * Génère un identifiant stable de brouillon stocké dans localStorage.
 * Réutilisé entre les reloads → si le client ferme l'onglet et revient,
 * il (du serveur) sait que c'est le même brouillon.
 *
 * Pas de crypto.randomUUID() côté SSR (window.crypto absent au build),
 * d'où l'init dans un effect côté client.
 */
function readOrCreateDraftId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(DRAFT_ID_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `d_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(DRAFT_ID_KEY, fresh);
    return fresh;
  } catch {
    // Mode incognito strict / storage refusé → identifiant éphémère.
    return `d_${Date.now().toString(36)}`;
  }
}

/**
 * Auto-sauvegarde l'état du wizard côté serveur (POST /api/quotes/draft)
 * dès que des informations significatives ont été saisies. Debounced.
 *
 * Conditions de déclenchement :
 *   - L'utilisateur a saisi quelque chose (au moins email OU phone OU
 *     productType OU une étape suffisamment avancée).
 *   - L'état a changé depuis la dernière sauvegarde réussie.
 *
 * Retourne le draftId courant pour que la soumission finale puisse
 * référencer le brouillon (et la route /api/quotes/submit l'upgrade
 * en place au lieu de créer un doublon).
 */
export function useDraftAutoSave(state: WizardState): string {
  const draftIdRef = useRef<string>('');
  // Sérialisation stable pour détecter les changements. JSON.stringify
  // ignore les `undefined`, on extrait les champs significatifs seulement.
  const fingerprint = useMemo(() => {
    const f = {
      email: state.email,
      phone: state.phone,
      firstName: state.firstName,
      lastName: state.lastName,
      entrepriseName: state.entrepriseName,
      siret: state.siret,
      tvaFr: state.tvaFr,
      tvaUe: state.tvaUe,
      productType: state.productType,
      persoLevel: state.persoLevel,
      category: state.category,
      grammage: state.grammage,
      matiere: state.matiere,
      packagingId: state.packagingId,
      quantity: state.quantity,
      brief: state.brief,
      deliveryStreet1: state.deliveryStreet1,
      deliveryCity: state.deliveryCity,
      deliveryCountry: state.deliveryCountry,
      deliveryPostalCode: state.deliveryPostalCode,
      deliveryContactName: state.deliveryContactName,
      carrierPhone: state.carrierPhone,
      billingSame: state.billingSame,
      billingStreet1: state.billingStreet1,
      billingCity: state.billingCity,
      billingCountry: state.billingCountry,
      billingPostalCode: state.billingPostalCode,
      message: state.message,
    };
    return JSON.stringify(f);
  }, [state]);

  // Lazy init du draftId côté client uniquement (évite l'hydration mismatch).
  useEffect(() => {
    if (!draftIdRef.current) draftIdRef.current = readOrCreateDraftId();
  }, []);

  // Debounced auto-save.
  useEffect(() => {
    // On ne sauvegarde rien tant que l'utilisateur n'a saisi aucune info
    // significative — évite de polluer la DB avec une ligne vide par visiteur.
    const hasSomething =
      !!state.email ||
      !!state.phone ||
      !!state.firstName ||
      !!state.entrepriseName ||
      !!state.productType ||
      !!state.brief;
    if (!hasSomething) return;
    if (!draftIdRef.current) draftIdRef.current = readOrCreateDraftId();
    const draftId = draftIdRef.current;
    if (!draftId) return;

    const timer = window.setTimeout(() => {
      // Note : on retire `attachmentFile` qui n'est pas sérialisable.
      const payload = { ...state, attachmentFile: undefined };
      void fetch('/api/quotes/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, payload }),
        keepalive: true,
      }).catch(() => {
        // Silent — un échec de sauvegarde n'a pas à interrompre le wizard.
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
    // fingerprint sert de clé de re-déclenchement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  return draftIdRef.current;
}

/**
 * Une fois la soumission finale acceptée, on efface le draftId du
 * localStorage pour qu'une nouvelle visite démarre un nouveau brouillon.
 */
export function clearDraftId(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRAFT_ID_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Lit le draftId existant sans en créer un nouveau si absent. Utile
 * pour la soumission finale qui veut juste référencer le brouillon
 * déjà sauvegardé (s'il y en a un).
 */
export function readExistingDraftId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(DRAFT_ID_KEY) ?? '';
  } catch {
    return '';
  }
}
