'use client';

import { useEffect } from 'react';
import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { isValidSiret, isValidVatEu, isValidVatFr } from '@/lib/validation/identifiers';

export function StepShipping() {
  const { state, set } = useWizard();
  const isPro = state.profile === 'professionnel';
  const isFrance = (state.country ?? '').toLowerCase() === 'france';

  // Pre-fill delivery contact name with entreprise / full name on first arrival.
  useEffect(() => {
    if (state.deliveryContactName) return;
    const guess = isPro
      ? state.entrepriseName
      : `${state.firstName} ${state.lastName}`.trim();
    if (guess) set({ deliveryContactName: guess });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const siretInvalid = isPro && isFrance && state.siret && !isValidSiret(state.siret);
  const vatFrInvalid = isPro && isFrance && state.tvaFr && !isValidVatFr(state.tvaFr);
  const vatEuInvalid = isPro && !isFrance && state.tvaUe && !isValidVatEu(state.tvaUe);

  return (
    <div className="space-y-8">
      <StepHeader title="Livraison & facturation" subtitle="Où et comment vous livrer ?" />

      <Section title="Adresse de livraison">
        <Field label="Nom du contact" hint="optionnel">
          <input
            type="text"
            className="qw-input"
            placeholder="Nom à mentionner sur la livraison"
            value={state.deliveryContactName}
            onChange={(e) => set({ deliveryContactName: e.target.value })}
          />
        </Field>
        <Field label="Rue 1" required>
          <input
            type="text"
            className="qw-input"
            autoComplete="address-line1"
            value={state.deliveryStreet1}
            onChange={(e) => set({ deliveryStreet1: e.target.value })}
          />
        </Field>
        <Field label="Rue 2" hint="optionnel">
          <input
            type="text"
            className="qw-input"
            autoComplete="address-line2"
            value={state.deliveryStreet2}
            onChange={(e) => set({ deliveryStreet2: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Code postal" required>
            <input
              type="text"
              className="qw-input"
              autoComplete="postal-code"
              value={state.deliveryPostalCode}
              onChange={(e) => set({ deliveryPostalCode: e.target.value })}
            />
          </Field>
          <Field label="Ville" required>
            <input
              type="text"
              className="qw-input"
              autoComplete="address-level2"
              value={state.deliveryCity}
              onChange={(e) => set({ deliveryCity: e.target.value })}
            />
          </Field>
          <Field label="Région / État" hint="optionnel">
            <input
              type="text"
              className="qw-input"
              autoComplete="address-level1"
              value={state.deliveryState}
              onChange={(e) => set({ deliveryState: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Pays" required>
          <input
            type="text"
            className="qw-input"
            autoComplete="country-name"
            value={state.deliveryCountry}
            onChange={(e) => set({ deliveryCountry: e.target.value })}
          />
        </Field>
        <Field label="Téléphone transporteur" hint="optionnel">
          <input
            type="tel"
            className="qw-input"
            placeholder="Pour planifier la livraison"
            value={state.carrierPhone}
            onChange={(e) => set({ carrierPhone: e.target.value })}
          />
        </Field>
      </Section>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={state.billingSame}
          onChange={(e) => set({ billingSame: e.target.checked })}
          className="w-4 h-4 accent-[var(--qw-gold)]"
        />
        <span className="text-sm">Adresse de facturation identique à la livraison</span>
      </label>

      {!state.billingSame && (
        <Section title="Adresse de facturation">
          <Field label="Rue 1" required>
            <input
              type="text"
              className="qw-input"
              value={state.billingStreet1}
              onChange={(e) => set({ billingStreet1: e.target.value })}
            />
          </Field>
          <Field label="Rue 2" hint="optionnel">
            <input
              type="text"
              className="qw-input"
              value={state.billingStreet2}
              onChange={(e) => set({ billingStreet2: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Code postal" required>
              <input
                type="text"
                className="qw-input"
                value={state.billingPostalCode}
                onChange={(e) => set({ billingPostalCode: e.target.value })}
              />
            </Field>
            <Field label="Ville" required>
              <input
                type="text"
                className="qw-input"
                value={state.billingCity}
                onChange={(e) => set({ billingCity: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Pays" required>
            <input
              type="text"
              className="qw-input"
              value={state.billingCountry}
              onChange={(e) => set({ billingCountry: e.target.value })}
            />
          </Field>
        </Section>
      )}

      {isPro && (
        <Section title="Identifiants entreprise">
          {isFrance ? (
            <>
              <Field label="SIRET" hint="14 chiffres — optionnel">
                <input
                  type="text"
                  className={`qw-input ${siretInvalid ? 'is-invalid' : ''}`}
                  placeholder="000 000 000 00000"
                  value={state.siret}
                  onChange={(e) => set({ siret: e.target.value })}
                />
                {siretInvalid && (
                  <span className="text-xs text-[var(--qw-error)] mt-1 block">
                    Format invalide — attendu 14 chiffres.
                  </span>
                )}
              </Field>
              <Field label="N° TVA intracommunautaire" hint="FR + 11 caractères — optionnel">
                <input
                  type="text"
                  className={`qw-input ${vatFrInvalid ? 'is-invalid' : ''}`}
                  placeholder="FR12345678901"
                  value={state.tvaFr}
                  onChange={(e) => set({ tvaFr: e.target.value })}
                />
                {vatFrInvalid && (
                  <span className="text-xs text-[var(--qw-error)] mt-1 block">
                    Format TVA française invalide.
                  </span>
                )}
              </Field>
            </>
          ) : (
            <Field label="N° TVA intracommunautaire" hint="optionnel">
              <input
                type="text"
                className={`qw-input ${vatEuInvalid ? 'is-invalid' : ''}`}
                placeholder="ex. DE123456789"
                value={state.tvaUe}
                onChange={(e) => set({ tvaUe: e.target.value })}
              />
              {vatEuInvalid && (
                <span className="text-xs text-[var(--qw-error)] mt-1 block">
                  Format TVA UE invalide.
                </span>
              )}
            </Field>
          )}
        </Section>
      )}

      <Section title="Message complémentaire" optional>
        <textarea
          className="qw-input min-h-24"
          rows={4}
          placeholder="Informations utiles à la préparation de votre devis…"
          value={state.message}
          onChange={(e) => set({ message: e.target.value })}
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  optional,
  children,
}: {
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] bg-[var(--qw-cream)]/30 p-5 sm:p-6 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gold-dark">
        {title}
        {optional && (
          <span className="ml-2 text-ink-soft font-normal normal-case">— optionnel</span>
        )}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="qw-label">
        {label}
        {required && <span className="qw-req" />}
        {hint && (
          <span className="ml-1 text-ink-soft font-normal normal-case tracking-normal">
            ({hint})
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
