'use client';

import type { ReactNode } from 'react';

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
  tall,
}: PickCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`qw-card-pick ${selected ? 'is-selected' : ''} w-full`}
    >
      {imageUrl && (
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
