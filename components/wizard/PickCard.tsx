'use client';

import type { ReactNode } from 'react';

export interface InfoChip {
  icon: ReactNode;
  label: string;
}

interface PickCardProps {
  selected?: boolean;
  onClick: () => void;
  imageUrl?: string;
  imageAlt?: string;
  icon?: ReactNode;
  title: string;
  desc?: string;
  meta?: string;
  chips?: string[];
  ghostChips?: string[];
  /** Pastilles d'information (icône + label), outlined, neutres. */
  infoChips?: InfoChip[];
  tall?: boolean;
}

export function PickCard({
  selected,
  onClick,
  imageUrl,
  imageAlt,
  icon,
  title,
  desc,
  meta,
  chips,
  ghostChips,
  infoChips,
  tall,
}: PickCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`qw-card-pick ${selected ? 'is-selected' : ''} w-full`}
    >
      {imageUrl && imageUrl !== 'TODO' && (
        <span className="block w-full aspect-square overflow-hidden rounded-[var(--qw-input-radius)] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={imageAlt ?? title}
            loading="lazy"
            className="w-full h-full object-contain"
          />
        </span>
      )}
      {imageUrl === 'TODO' && (
        <span
          className="flex items-center justify-center w-full aspect-square rounded-[var(--qw-input-radius)] text-xs text-ink-soft"
          style={{
            background: 'var(--qw-cream)',
            border: '1px dashed var(--qw-cream-strong)',
          }}
          aria-label="Image à venir"
        >
          Image à venir
        </span>
      )}
      {icon && !imageUrl && (
        <span
          aria-hidden="true"
          className="text-3xl"
          style={{ color: 'var(--qw-gold-dark)' }}
        >
          {icon}
        </span>
      )}
      <span className={`font-semibold text-ink ${tall ? 'mt-1' : ''}`}>{title}</span>
      {desc && <span className="text-sm text-ink-soft">{desc}</span>}
      {meta && (
        <span className="text-xs uppercase tracking-[0.06em] text-gold-dark">
          {meta}
        </span>
      )}
      {infoChips?.length ? (
        <span className="flex flex-wrap gap-1.5 mt-1.5">
          {infoChips.map((c, i) => (
            <span
              key={`${c.label}-${i}`}
              className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full font-medium text-ink-soft"
              style={{
                background: '#fff',
                border: '1px solid var(--qw-cream-strong)',
              }}
            >
              <span style={{ color: 'var(--qw-gold-dark)' }} className="shrink-0">
                {c.icon}
              </span>
              {c.label}
            </span>
          ))}
        </span>
      ) : null}
      {(chips?.length || ghostChips?.length) && (
        <span className="flex flex-wrap gap-1.5 mt-2">
          {chips?.map((c) => (
            <span
              key={c}
              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: 'var(--qw-gold)',
                color: '#fff',
              }}
            >
              {c}
            </span>
          ))}
          {ghostChips?.map((c) => (
            <span
              key={c}
              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: 'var(--qw-gold-light)',
                color: 'var(--qw-gold-dark)',
              }}
            >
              {c}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
