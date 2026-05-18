'use client';

import { useMemo } from 'react';
import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import {
  OPTIONS,
  PRICING,
  PRICING_PLATEAUX,
  formatEuro,
  isPlateauxCategory,
  pricingKey,
  quantityRule,
  validateQuantity,
} from '@/lib/pricing';
import type { WizardState } from '@/types/wizard';

interface Tier {
  /** Quantité minimale (en Oshibori ou plateaux selon contexte) */
  min: number;
  /** Prix unitaire (€ / unité) */
  unit: number;
}

function buildTiers(state: WizardState): Tier[] {
  if (isPlateauxCategory(state)) {
    return PRICING_PLATEAUX.map((t) => ({
      min: t.minCartons * 48,
      // Prix carton → prix plateau (1 carton = 48 plateaux)
      unit: t.price / 48,
    }));
  }
  const key = pricingKey(state);
  if (!key) return [];
  // Surcharge bambou 15g + green formula appliquée à tous les paliers
  // pour que le tableau reflète le vrai prix unitaire.
  let bonus = 0;
  if (
    state.persoLevel === 'Full perso' &&
    state.grammage === '15 grammes' &&
    state.matiere === '80% Bambou - 20% Coton'
  ) {
    bonus += OPTIONS.bambou15g;
  }
  if (state.greenFormula) bonus += OPTIONS.greenFormula;
  return PRICING[key].map((t) => ({ min: t.min, unit: t.price + bonus }));
}

/** Snap `value` au multiple le plus proche, borné dans [min, max]. */
function snap(value: number, multiple: number, min: number, max: number): number {
  const v = Math.round(value / multiple) * multiple;
  return Math.max(min, Math.min(max, v));
}

export function StepQuantity() {
  const { state, set } = useWizard();

  const rule = useMemo(() => quantityRule(state), [state]);
  const tiers = useMemo(() => buildTiers(state), [state]);
  const validation = useMemo(() => validateQuantity(state), [state]);
  const isPlateaux = isPlateauxCategory(state);
  const showAdvantages = state.productType === 'Oshibori';
  const showDluShelf = state.productType === 'Oshibori' && state.persoLevel === 'Full perso';

  // Bornes slider :
  //   - min = rule.min
  //   - max = rule.max OU dernier palier × 1.5 (arrondi au multiple)
  //   - si rien : 25 000 par défaut
  const sliderBounds = useMemo(() => {
    const min = rule.min;
    const lastTier = tiers.length > 0 ? tiers[tiers.length - 1].min : 0;
    let max =
      rule.max ??
      (lastTier > 0 ? Math.round((lastTier * 1.5) / rule.multiple) * rule.multiple : 25000);
    if (max <= min) max = min + rule.multiple * 10;
    return { min, max };
  }, [rule, tiers]);

  const inc = () => {
    const next = (state.quantity ?? 0) + rule.multiple;
    set({ quantity: next });
  };
  const dec = () => {
    const next = Math.max(0, (state.quantity ?? 0) - rule.multiple);
    set({ quantity: next || null });
  };

  // Quantité affichée par le slider : si state.quantity n'est pas
  // initialisée, on cale sur rule.min pour que le curseur ait une
  // position visible. Sinon on borne dans le range du slider (l'input
  // numérique reste libre au-delà du max d'affichage).
  const sliderValue = useMemo(() => {
    const q = state.quantity ?? sliderBounds.min;
    return Math.max(sliderBounds.min, Math.min(sliderBounds.max, q));
  }, [state.quantity, sliderBounds]);

  // Index du palier actif (le plus grand min qui est ≤ quantité).
  const activeTierIdx = useMemo(() => {
    const q = state.quantity ?? 0;
    let idx = -1;
    for (let i = 0; i < tiers.length; i++) {
      if (q >= tiers[i].min) idx = i;
    }
    return idx;
  }, [state.quantity, tiers]);

  // Économie en % vs le 1er palier
  const savings = (unit: number): string => {
    if (tiers.length === 0) return '';
    const baseline = tiers[0].unit;
    if (unit >= baseline) return '—';
    const pct = Math.round(((baseline - unit) / baseline) * 100);
    return `-${pct} %`;
  };

  // Ticks visibles sous le slider : tous les paliers qui tombent dans
  // [sliderBounds.min, sliderBounds.max].
  const tickValues = useMemo(() => {
    const ticks: number[] = [sliderBounds.min];
    for (const t of tiers) {
      if (t.min > sliderBounds.min && t.min < sliderBounds.max) ticks.push(t.min);
    }
    ticks.push(sliderBounds.max);
    return Array.from(new Set(ticks)).sort((a, b) => a - b);
  }, [tiers, sliderBounds]);

  const tickPercent = (v: number) =>
    ((v - sliderBounds.min) / (sliderBounds.max - sliderBounds.min)) * 100;

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

      {/* Slider de quantité */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-soft">
            Quantité
          </span>
          <span className="font-semibold text-ink text-lg tabular-nums">
            {(state.quantity ?? sliderBounds.min).toLocaleString('fr-FR')}{' '}
            <span className="text-xs text-ink-soft font-normal">
              {isPlateaux ? 'plateaux' : 'unités'}
            </span>
          </span>
        </div>
        <div className="relative pt-1 pb-6">
          <input
            type="range"
            min={sliderBounds.min}
            max={sliderBounds.max}
            step={rule.multiple}
            value={sliderValue}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isFinite(v)) return;
              set({ quantity: snap(v, rule.multiple, sliderBounds.min, sliderBounds.max) });
            }}
            aria-label="Sélecteur de quantité"
            className="qw-range w-full"
          />
          {/* Ticks */}
          <div className="absolute inset-x-0 top-6 pointer-events-none">
            {tickValues.map((v) => (
              <span
                key={v}
                className="absolute -translate-x-1/2 block"
                style={{ left: `${tickPercent(v)}%` }}
              >
                <span className="block w-px h-2 bg-[var(--qw-cream-strong)] mx-auto" />
                <span
                  className={`block mt-1 text-[10px] whitespace-nowrap ${
                    v === state.quantity ? 'text-gold-dark font-semibold' : 'text-ink-soft'
                  }`}
                >
                  {v.toLocaleString('fr-FR')}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* +/− input pour saisie précise */}
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

      {/* Tableau paliers volume */}
      {tiers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-soft">
            Paliers volume
          </h3>
          <div className="rounded-[var(--qw-input-radius)] border border-[var(--qw-cream-strong)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.06em] text-ink-soft bg-[var(--qw-cream)]/40">
                  <th className="text-left font-medium px-4 py-2.5">À partir de</th>
                  <th className="text-left font-medium px-4 py-2.5">Prix unitaire</th>
                  <th className="text-right font-medium px-4 py-2.5">Économie</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => {
                  const active = i === activeTierIdx;
                  return (
                    <tr
                      key={t.min}
                      onClick={() =>
                        set({
                          quantity: snap(
                            t.min,
                            rule.multiple,
                            sliderBounds.min,
                            // l'input numérique reste libre, donc on tape t.min direct
                            Math.max(sliderBounds.max, t.min),
                          ),
                        })
                      }
                      className={`cursor-pointer transition-colors ${
                        active
                          ? 'bg-[var(--qw-cream)]'
                          : 'hover:bg-[var(--qw-cream)]/30'
                      } ${i > 0 ? 'border-t border-[var(--qw-cream-strong)]' : ''}`}
                    >
                      <td className="px-4 py-2.5 font-medium">
                        <span className="inline-flex items-center gap-2">
                          {active && (
                            <span
                              aria-hidden="true"
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: 'var(--qw-gold)' }}
                            />
                          )}
                          ≥ {t.min.toLocaleString('fr-FR')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        <strong className="font-semibold">{formatEuro(t.unit)}</strong>
                        <span className="text-ink-soft">/u</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-ink-soft tabular-nums">
                        {savings(t.unit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] italic text-ink-soft">
            Prix HT, EXW France · transport en sus, devis détaillé sous 24 h.
          </p>
        </div>
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

