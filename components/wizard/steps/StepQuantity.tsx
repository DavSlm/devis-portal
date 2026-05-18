'use client';

import { useMemo } from 'react';
import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import {
  computeSuggestions,
  isPlateauxCategory,
  priceLabelForQuantity,
  quantityRule,
  validateQuantity,
} from '@/lib/pricing';

export function StepQuantity() {
  const { state, set } = useWizard();

  const rule = useMemo(() => quantityRule(state), [state]);
  const suggestions = useMemo(() => computeSuggestions(state, rule), [state, rule]);
  const validation = useMemo(() => validateQuantity(state), [state]);
  const isPlateaux = isPlateauxCategory(state);
  const showAdvantages = state.productType === 'Oshibori';
  const showDluShelf = state.productType === 'Oshibori' && state.persoLevel === 'Full perso';

  const inc = () => {
    const next = (state.quantity ?? 0) + rule.multiple;
    set({ quantity: next });
  };
  const dec = () => {
    const next = Math.max(0, (state.quantity ?? 0) - rule.multiple);
    set({ quantity: next || null });
  };

  return (
    <div className="space-y-8">
      <StepHeader title="Quantité souhaitée" subtitle={rule.label} />

      {showDluShelf && (
        <p
          className="rounded-[var(--qw-input-radius)] px-4 py-3 text-sm"
          style={{
            background: 'var(--qw-gold-light)',
            borderLeft: '3px solid var(--qw-gold)',
          }}
        >
          <strong className="text-gold-dark font-semibold">Bon à savoir :</strong> la DLU des
          Oshibori est de 2 ans après production. Pour optimiser votre prix unitaire,
          calculez une estimation de votre consommation sur 2 ans.
        </p>
      )}

      <div className="flex items-center gap-3 justify-center">
        <button
          type="button"
          onClick={dec}
          aria-label="Diminuer"
          className="w-11 h-11 rounded-full border border-[var(--qw-border-soft)] text-xl text-ink hover:bg-[var(--qw-cream)] transition-colors"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={rule.min}
          max={rule.max ?? undefined}
          step={rule.multiple}
          placeholder="0"
          value={state.quantity ?? ''}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            set({ quantity: Number.isFinite(v) ? v : null });
          }}
          className={`qw-input text-center text-xl font-semibold w-44 ${
            !validation.ok && state.quantity ? 'is-invalid' : ''
          }`}
        />
        <button
          type="button"
          onClick={inc}
          aria-label="Augmenter"
          className="w-11 h-11 rounded-full border border-[var(--qw-border-soft)] text-xl text-ink hover:bg-[var(--qw-cream)] transition-colors"
        >
          +
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map((v) => {
            const qtyLabel = `${v.toLocaleString('fr-FR')} ${
              isPlateaux ? 'plateaux' : 'Oshibori'
            }`;
            const priceLabel = priceLabelForQuantity(state, v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => set({ quantity: v })}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-sm transition-all ${
                  state.quantity === v
                    ? 'border-[var(--qw-gold-dark)] bg-[var(--qw-cream)]'
                    : 'border-[var(--qw-border-soft)] bg-white hover:border-[var(--qw-gold)]'
                }`}
              >
                <span className="font-medium">{qtyLabel}</span>
                {priceLabel && (
                  <span className="text-xs text-ink-soft">{priceLabel}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {suggestions.length > 0 && (
        <p className="text-center text-xs italic text-ink-soft">
          Prix HT, EXW France · transport en sus, devis détaillé sous 24 h.
        </p>
      )}

      <p
        className={`text-center text-sm min-h-6 ${
          validation.ok
            ? 'text-[var(--qw-success)]'
            : state.quantity
              ? 'text-[var(--qw-error)]'
              : 'text-ink-soft'
        }`}
      >
        {validation.msg}
      </p>

      {showAdvantages && <Advantages />}
    </div>
  );
}

const ADVANTAGES: string[] = [
  'Production française',
  'Conditionnement français',
  'Usine certifiée cosmétique, norme ISO 22716',
  'Parfums signature, fragrances haut de gamme exclusives',
  'Fabriqué en France',
  'Matières naturelles : 100% coton ou 80% bambou / 20% coton',
  'Testé dermatologiquement, hypoallergénique et sans alcool',
  'Lot tracé · DLU de 2 ans à partir de la production',
  'Sécurité et traçabilité garanties pour vos clients',
];

function Advantages() {
  return (
    <section className="pt-6 border-t border-[var(--qw-cream-strong)] space-y-3">
      <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-dark">
        Nos engagements
      </h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 list-none">
        {ADVANTAGES.map((adv) => (
          <li key={adv} className="relative pl-5 text-sm text-ink-soft leading-snug">
            <span
              className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--qw-gold)' }}
              aria-hidden="true"
            />
            {adv}
          </li>
        ))}
      </ul>
    </section>
  );
}
