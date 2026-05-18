'use client';

import { useState } from 'react';
import { useWizard } from '../WizardProvider';
import { clearDraftId, readExistingDraftId } from '../useDraftAutoSave';
import { StepHeader } from './StepHeader';
import {
  computeQuoteTotal,
  formatEuro,
  isPlateauxCategory,
  priceLabelForQuantity,
} from '@/lib/pricing';
import { useT } from '@/lib/i18n/Provider';

export function StepSummary() {
  const { state } = useWizard();
  const { t, locale } = useT();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmtNum = (n: number) =>
    n.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US');

  const { total, unitPrice } = computeQuoteTotal(state);
  const unitLabel = priceLabelForQuantity(state, state.quantity);
  const isPlateaux = isPlateauxCategory(state);

  async function submit() {
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    const { attachmentFile, ...rest } = state;
    fd.append('payload', JSON.stringify(rest));
    if (attachmentFile) fd.append('file', attachmentFile);
    const draftId = readExistingDraftId();
    if (draftId) fd.append('draftId', draftId);

    try {
      const res = await fetch('/api/quotes/submit', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `${t('summary.error')} ${res.status}`);
      }
      const { id } = (await res.json()) as { id: string };
      clearDraftId();
      window.location.href = `/thanks?id=${id}`;
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <StepHeader title={t('summary.title')} subtitle={t('summary.subtitle')} />

      <Block title={t('summary.contact')}>
        <Row
          label={t('summary.type')}
          value={state.profile === 'professionnel' ? t('profile.pro') : t('profile.particulier')}
        />
        {state.entrepriseName && <Row label={t('profile.company_name')} value={state.entrepriseName} />}
        <Row label={t('summary.name')} value={`${state.firstName} ${state.lastName}`} />
        <Row label={t('profile.email')} value={state.email} />
        <Row label={t('summary.phone')} value={state.phone} />
        {state.country && <Row label={t('profile.country')} value={state.country} />}
      </Block>

      <Block title={t('summary.product')}>
        <Row label={t('summary.range')} value={state.productType ?? '—'} />
        {state.persoLevel && <Row label={t('summary.perso')} value={state.persoLevel} />}
        {state.category && <Row label={t('summary.category')} value={state.category} />}
        {state.grammage && <Row label={t('summary.grammage')} value={state.grammage} />}
        {state.matiere && <Row label={t('summary.matiere')} value={state.matiere} />}
        {state.packaging && <Row label={t('summary.packaging')} value={state.packaging} />}
      </Block>

      {(state.brief || state.fileName) && (
        <Block title={t('summary.brief')}>
          {state.fileName && <Row label={t('summary.file')} value={state.fileName} />}
          {state.brief && <Row label={t('summary.description')} value={state.brief} multiline />}
        </Block>
      )}

      <Block title={t('summary.quantity_estimate')}>
        <Row
          label={t('summary.quantity')}
          value={
            state.quantity
              ? `${fmtNum(state.quantity)} ${
                  isPlateaux ? t('quantity.plateaux') : 'Oshibori'
                }`
              : '—'
          }
        />
        {unitLabel && <Row label={t('summary.unit_price_est')} value={unitLabel} />}
        {total && unitPrice && (
          <Row
            label={t('summary.total_ht_est')}
            value={
              <span className="font-semibold text-gold-dark">{formatEuro(total)}</span>
            }
          />
        )}
        <p className="text-xs italic text-ink-soft mt-2">{t('summary.estimate_note')}</p>
      </Block>

      <Block title={t('summary.delivery')}>
        {state.deliveryContactName && (
          <Row label={t('summary.contact_label')} value={state.deliveryContactName} />
        )}
        <Row
          label={t('summary.address')}
          value={[
            state.deliveryStreet1,
            state.deliveryStreet2,
            [state.deliveryPostalCode, state.deliveryCity].filter(Boolean).join(' '),
            state.deliveryState,
            state.deliveryCountry,
          ]
            .filter(Boolean)
            .join(', ')}
        />
        {state.carrierPhone && <Row label={t('summary.carrier_phone')} value={state.carrierPhone} />}
      </Block>

      {!state.billingSame && (
        <Block title={t('summary.billing')}>
          <Row
            label={t('summary.address')}
            value={[
              state.billingStreet1,
              state.billingStreet2,
              [state.billingPostalCode, state.billingCity].filter(Boolean).join(' '),
              state.billingCountry,
            ]
              .filter(Boolean)
              .join(', ')}
          />
        </Block>
      )}

      {(state.siret || state.tvaFr || state.tvaUe) && (
        <Block title={t('summary.ids')}>
          {state.siret && <Row label={t('shipping.siret')} value={state.siret} />}
          {state.tvaFr && <Row label={t('summary.vat_fr')} value={state.tvaFr} />}
          {state.tvaUe && <Row label={t('summary.vat_ue')} value={state.tvaUe} />}
        </Block>
      )}

      {state.message && (
        <Block title={t('summary.message')}>
          <Row label="" value={state.message} multiline />
        </Block>
      )}

      {error && (
        <div
          className="rounded-[var(--qw-input-radius)] px-4 py-3 text-sm"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            color: 'var(--qw-error)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
          }}
        >
          {error}
        </div>
      )}

      <div className="text-center pt-4">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="px-8 py-3 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? t('summary.sending') : t('summary.submit')}
        </button>
        <p className="text-xs text-ink-soft mt-3">{t('summary.after_note')}</p>
      </div>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] bg-white p-5 sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gold-dark mb-3">
        {title}
      </h3>
      <dl className="space-y-1.5 text-sm">{children}</dl>
    </section>
  );
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string;
  value: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div
      className={
        multiline
          ? 'flex flex-col gap-1'
          : 'flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3'
      }
    >
      {label && (
        <dt className="text-ink-soft text-xs uppercase tracking-[0.06em] sm:w-44 shrink-0">
          {label}
        </dt>
      )}
      <dd className={multiline ? 'whitespace-pre-wrap' : 'flex-1'}>{value}</dd>
    </div>
  );
}
