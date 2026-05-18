'use client';

import { useEffect } from 'react';
import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { isValidSiret, isValidVatEu, isValidVatFr } from '@/lib/validation/identifiers';
import { useT } from '@/lib/i18n/Provider';

export function StepShipping() {
  const { state, set } = useWizard();
  const { t } = useT();
  const isPro = state.profile === 'professionnel';
  const isFrance = (state.country ?? '').toLowerCase() === 'france';

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
      <StepHeader title={t('shipping.title')} subtitle={t('shipping.subtitle')} />

      <Section title={t('shipping.delivery_title')}>
        <Field label={t('shipping.contact_name')} hint={t('shipping.optional')}>
          <input
            type="text"
            className="qw-input"
            placeholder={t('shipping.contact_name_hint')}
            value={state.deliveryContactName}
            onChange={(e) => set({ deliveryContactName: e.target.value })}
          />
        </Field>
        <Field label={t('shipping.street1')} required>
          <input
            type="text"
            className="qw-input"
            autoComplete="address-line1"
            value={state.deliveryStreet1}
            onChange={(e) => set({ deliveryStreet1: e.target.value })}
          />
        </Field>
        <Field label={t('shipping.street2')} hint={t('shipping.optional')}>
          <input
            type="text"
            className="qw-input"
            autoComplete="address-line2"
            value={state.deliveryStreet2}
            onChange={(e) => set({ deliveryStreet2: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={t('shipping.postal_code')} required>
            <input
              type="text"
              className="qw-input"
              autoComplete="postal-code"
              value={state.deliveryPostalCode}
              onChange={(e) => set({ deliveryPostalCode: e.target.value })}
            />
          </Field>
          <Field label={t('shipping.city')} required>
            <input
              type="text"
              className="qw-input"
              autoComplete="address-level2"
              value={state.deliveryCity}
              onChange={(e) => set({ deliveryCity: e.target.value })}
            />
          </Field>
          <Field label={t('shipping.state')} hint={t('shipping.optional')}>
            <input
              type="text"
              className="qw-input"
              autoComplete="address-level1"
              value={state.deliveryState}
              onChange={(e) => set({ deliveryState: e.target.value })}
            />
          </Field>
        </div>
        <Field label={t('shipping.country')} required>
          <input
            type="text"
            className="qw-input"
            autoComplete="country-name"
            value={state.deliveryCountry}
            onChange={(e) => set({ deliveryCountry: e.target.value })}
          />
        </Field>
        <Field label={t('shipping.carrier_phone')} hint={t('shipping.optional')}>
          <input
            type="tel"
            className="qw-input"
            placeholder={t('shipping.carrier_phone_hint')}
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
        <span className="text-sm">{t('shipping.billing_same')}</span>
      </label>

      {!state.billingSame && (
        <Section title={t('shipping.billing_title')}>
          <Field label={t('shipping.street1')} required>
            <input
              type="text"
              className="qw-input"
              value={state.billingStreet1}
              onChange={(e) => set({ billingStreet1: e.target.value })}
            />
          </Field>
          <Field label={t('shipping.street2')} hint={t('shipping.optional')}>
            <input
              type="text"
              className="qw-input"
              value={state.billingStreet2}
              onChange={(e) => set({ billingStreet2: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('shipping.postal_code')} required>
              <input
                type="text"
                className="qw-input"
                value={state.billingPostalCode}
                onChange={(e) => set({ billingPostalCode: e.target.value })}
              />
            </Field>
            <Field label={t('shipping.city')} required>
              <input
                type="text"
                className="qw-input"
                value={state.billingCity}
                onChange={(e) => set({ billingCity: e.target.value })}
              />
            </Field>
          </div>
          <Field label={t('shipping.country')} required>
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
        <Section title={t('shipping.company_id_title')}>
          {isFrance ? (
            <>
              <Field label={t('shipping.siret')} hint={t('shipping.siret_hint')}>
                <input
                  type="text"
                  className={`qw-input ${siretInvalid ? 'is-invalid' : ''}`}
                  placeholder={t('shipping.siret_placeholder')}
                  value={state.siret}
                  onChange={(e) => set({ siret: e.target.value })}
                />
                {siretInvalid && (
                  <span className="text-xs text-[var(--qw-error)] mt-1 block">
                    {t('shipping.siret_invalid')}
                  </span>
                )}
              </Field>
              <Field label={t('shipping.vat')} hint={t('shipping.vat_hint')}>
                <input
                  type="text"
                  className={`qw-input ${vatFrInvalid ? 'is-invalid' : ''}`}
                  placeholder={t('shipping.vat_placeholder')}
                  value={state.tvaFr}
                  onChange={(e) => set({ tvaFr: e.target.value })}
                />
                {vatFrInvalid && (
                  <span className="text-xs text-[var(--qw-error)] mt-1 block">
                    {t('shipping.vat_fr_invalid')}
                  </span>
                )}
              </Field>
            </>
          ) : (
            <Field label={t('shipping.vat')} hint={t('shipping.optional')}>
              <input
                type="text"
                className={`qw-input ${vatEuInvalid ? 'is-invalid' : ''}`}
                placeholder="ex. DE123456789"
                value={state.tvaUe}
                onChange={(e) => set({ tvaUe: e.target.value })}
              />
              {vatEuInvalid && (
                <span className="text-xs text-[var(--qw-error)] mt-1 block">
                  {t('shipping.vat_ue_invalid')}
                </span>
              )}
            </Field>
          )}
        </Section>
      )}

      <Section title={t('shipping.message')} optionalLabel={t('shipping.message_optional')}>
        <textarea
          className="qw-input min-h-24"
          rows={4}
          placeholder={t('shipping.message_placeholder')}
          value={state.message}
          onChange={(e) => set({ message: e.target.value })}
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  optionalLabel,
  children,
}: {
  title: string;
  optionalLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] bg-[var(--qw-cream)]/30 p-5 sm:p-6 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gold-dark">
        {title}
        {optionalLabel && (
          <span className="ml-2 text-ink-soft font-normal normal-case">{optionalLabel}</span>
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
