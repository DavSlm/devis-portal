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

export function StepSummary() {
  const { state } = useWizard();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { total, unitPrice } = computeQuoteTotal(state);
  const unitLabel = priceLabelForQuantity(state, state.quantity);
  const isPlateaux = isPlateauxCategory(state);

  async function submit() {
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    // We send the whole state as a JSON blob plus the file separately,
    // because FormData handles the binary natively.
    const { attachmentFile, ...rest } = state;
    fd.append('payload', JSON.stringify(rest));
    if (attachmentFile) fd.append('file', attachmentFile);
    // Passe le draftId pour que /api/quotes/submit convertisse la ligne
    // brouillon existante en demande finalisée (au lieu de créer un doublon).
    const draftId = readExistingDraftId();
    if (draftId) fd.append('draftId', draftId);

    try {
      const res = await fetch('/api/quotes/submit', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erreur ${res.status}`);
      }
      const { id } = (await res.json()) as { id: string };
      // Soumission OK → on oublie le draftId pour qu'une future visite
      // démarre un nouveau brouillon.
      clearDraftId();
      window.location.href = `/thanks?id=${id}`;
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <StepHeader
        title="Récapitulatif"
        subtitle="Vérifiez votre demande avant envoi"
      />

      <Block title="Contact">
        <Row label="Type" value={state.profile === 'professionnel' ? 'Entreprise' : 'Particulier'} />
        {state.entrepriseName && <Row label="Entreprise" value={state.entrepriseName} />}
        <Row label="Nom" value={`${state.firstName} ${state.lastName}`} />
        <Row label="Email" value={state.email} />
        <Row label="Téléphone" value={state.phone} />
        {state.country && <Row label="Pays" value={state.country} />}
      </Block>

      <Block title="Produit">
        <Row label="Gamme" value={state.productType ?? '—'} />
        {state.persoLevel && <Row label="Personnalisation" value={state.persoLevel} />}
        {state.category && <Row label="Catégorie" value={state.category} />}
        {state.grammage && <Row label="Grammage" value={state.grammage} />}
        {state.matiere && <Row label="Matière" value={state.matiere} />}
        {state.packaging && <Row label="Emballage" value={state.packaging} />}
      </Block>

      {(state.brief || state.fileName) && (
        <Block title="Brief">
          {state.fileName && <Row label="Fichier" value={state.fileName} />}
          {state.brief && <Row label="Description" value={state.brief} multiline />}
        </Block>
      )}

      <Block title="Quantité & estimation">
        <Row
          label="Quantité"
          value={
            state.quantity
              ? `${state.quantity.toLocaleString('fr-FR')} ${
                  isPlateaux ? 'plateaux' : 'Oshibori'
                }`
              : '—'
          }
        />
        {unitLabel && <Row label="Prix unitaire estimé" value={unitLabel} />}
        {total && unitPrice && (
          <Row
            label="Total estimé HT"
            value={
              <span className="font-semibold text-gold-dark">{formatEuro(total)}</span>
            }
          />
        )}
        <p className="text-xs italic text-ink-soft mt-2">
          Estimation indicative — un devis détaillé vous sera envoyé sous 24 h.
        </p>
      </Block>

      <Block title="Livraison">
        {state.deliveryContactName && (
          <Row label="Contact" value={state.deliveryContactName} />
        )}
        <Row
          label="Adresse"
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
        {state.carrierPhone && <Row label="Tél. transporteur" value={state.carrierPhone} />}
      </Block>

      {!state.billingSame && (
        <Block title="Facturation">
          <Row
            label="Adresse"
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
        <Block title="Identifiants">
          {state.siret && <Row label="SIRET" value={state.siret} />}
          {state.tvaFr && <Row label="TVA FR" value={state.tvaFr} />}
          {state.tvaUe && <Row label="TVA UE" value={state.tvaUe} />}
        </Block>
      )}

      {state.message && (
        <Block title="Message">
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
          {submitting ? 'Envoi en cours…' : 'Envoyer ma demande de devis'}
        </button>
        <p className="text-xs text-ink-soft mt-3">
          Nous revenons vers vous sous 24 h ouvrées avec votre devis détaillé.
        </p>
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
