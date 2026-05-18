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
import {
  AwardIcon,
  CalendarIcon,
  DropletIcon,
  FlagFrIcon,
  LeafIcon,
  SparkleIcon,
} from '../icons';
import { useT } from '@/lib/i18n/Provider';

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

// Slider en échelle log : position 0..SLIDER_RES ↔ quantité [min, max].
// Évite que des paliers très proches (50, 300) se chevauchent visuellement.
const SLIDER_RES = 1000;

function qtyToPos(qty: number, min: number, max: number): number {
  if (max <= min) return 0;
  const t = Math.log(qty / min) / Math.log(max / min);
  return Math.round(Math.max(0, Math.min(1, t)) * SLIDER_RES);
}

function posToQty(pos: number, min: number, max: number): number {
  if (max <= min) return min;
  const t = pos / SLIDER_RES;
  return min * Math.pow(max / min, t);
}

export function StepQuantity() {
  const { state, set } = useWizard();
  const { t, locale } = useT();
  const fmtNum = (n: number) =>
    n.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US');

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

  return (
    <div className="space-y-8">
      <StepHeader title={t('quantity.title')} subtitle={rule.label} />

      {showDluShelf && (
        <p
          className="rounded-[var(--qw-input-radius)] px-4 py-3 text-sm"
          style={{
            background: 'var(--qw-gold-light)',
            borderLeft: '3px solid var(--qw-gold)',
          }}
        >
          <strong className="text-gold-dark font-semibold">{t('quantity.good_to_know')}</strong>{' '}
          {t('quantity.dlu_note')}
        </p>
      )}

      {/* Slider de quantité */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-soft">
            {t('quantity.label')}
          </span>
          <span className="font-semibold text-ink text-lg tabular-nums">
            {fmtNum(state.quantity ?? sliderBounds.min)}{' '}
            <span className="text-xs text-ink-soft font-normal">
              {isPlateaux ? t('quantity.plateaux') : t('quantity.units')}
            </span>
          </span>
        </div>
        <div className="relative pt-1 pb-6">
          <input
            type="range"
            min={0}
            max={SLIDER_RES}
            step={1}
            value={qtyToPos(sliderValue, sliderBounds.min, sliderBounds.max)}
            onChange={(e) => {
              const pos = parseInt(e.target.value, 10);
              if (!Number.isFinite(pos)) return;
              const raw = posToQty(pos, sliderBounds.min, sliderBounds.max);
              set({ quantity: snap(raw, rule.multiple, sliderBounds.min, sliderBounds.max) });
            }}
            aria-label={t('quantity.aria_select')}
            className="qw-range w-full"
          />
          {/* Ticks — positionnés en échelle log pour ne pas se chevaucher */}
          <div className="absolute inset-x-0 top-6 pointer-events-none">
            {tickValues.map((v) => (
              <span
                key={v}
                className="absolute -translate-x-1/2 block"
                style={{
                  left: `${(qtyToPos(v, sliderBounds.min, sliderBounds.max) / SLIDER_RES) * 100}%`,
                }}
              >
                <span className="block w-px h-2 bg-[var(--qw-cream-strong)] mx-auto" />
                <span
                  className={`block mt-1 text-[10px] whitespace-nowrap ${
                    v === state.quantity ? 'text-gold-dark font-semibold' : 'text-ink-soft'
                  }`}
                >
                  {fmtNum(v)}
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
          aria-label={t('quantity.decrease')}
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
          aria-label={t('quantity.increase')}
          className="w-11 h-11 rounded-full border border-[var(--qw-border-soft)] text-xl text-ink hover:bg-[var(--qw-cream)] transition-colors"
        >
          +
        </button>
      </div>

      {/* Tableau paliers volume */}
      {tiers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-soft">
            {t('quantity.tiers_title')}
          </h3>
          <div className="rounded-[var(--qw-input-radius)] border border-[var(--qw-cream-strong)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.06em] text-ink-soft bg-[var(--qw-cream)]/40">
                  <th className="text-left font-medium px-4 py-2.5">{t('quantity.th_from')}</th>
                  <th className="text-left font-medium px-4 py-2.5">{t('quantity.th_unit')}</th>
                  <th className="text-right font-medium px-4 py-2.5">{t('quantity.th_savings')}</th>
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
                          ≥ {fmtNum(t.min)}
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
          <p className="text-[11px] italic text-ink-soft">{t('quantity.prices_note')}</p>
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

function Advantages() {
  const { t } = useT();
  const ENGAGEMENTS = [
    {
      icon: <FlagFrIcon width={20} height={20} />,
      title: t('quantity.eng_made_title'),
      desc: t('quantity.eng_made_desc'),
    },
    {
      icon: <AwardIcon width={20} height={20} />,
      title: t('quantity.eng_iso_title'),
      desc: t('quantity.eng_iso_desc'),
    },
    {
      icon: <LeafIcon width={20} height={20} />,
      title: t('quantity.eng_natural_title'),
      desc: t('quantity.eng_natural_desc'),
    },
    {
      icon: <DropletIcon width={20} height={20} />,
      title: t('quantity.eng_derm_title'),
      desc: t('quantity.eng_derm_desc'),
    },
    {
      icon: <SparkleIcon width={20} height={20} />,
      title: t('quantity.eng_scent_title'),
      desc: t('quantity.eng_scent_desc'),
    },
    {
      icon: <CalendarIcon width={20} height={20} />,
      title: t('quantity.eng_trace_title'),
      desc: t('quantity.eng_trace_desc'),
    },
  ];
  return (
    <section className="pt-6 border-t border-[var(--qw-cream-strong)] space-y-4">
      <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-dark">
        {t('quantity.engagements_title')}
      </h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 list-none">
        {ENGAGEMENTS.map((e) => (
          <li key={e.title} className="flex items-start gap-3">
            <span
              className="shrink-0 mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-full"
              style={{
                background: 'var(--qw-gold-light)',
                color: 'var(--qw-gold-dark)',
              }}
              aria-hidden="true"
            >
              {e.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink leading-snug">
                {e.title}
              </span>
              <span className="block text-xs text-ink-soft leading-snug mt-0.5">
                {e.desc}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

