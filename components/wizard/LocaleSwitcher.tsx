'use client';

import { useT } from '@/lib/i18n/Provider';
import { LOCALES, type Locale } from '@/lib/i18n/dictionary';

const LABELS: Record<Locale, string> = {
  fr: 'FR',
  en: 'EN',
};

export function LocaleSwitcher() {
  const { locale, setLocale } = useT();

  return (
    <div
      role="group"
      aria-label="Langue"
      className="inline-flex items-center rounded-full bg-white border border-[var(--qw-cream-strong)] text-[11px] font-semibold overflow-hidden"
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={active}
            className={`px-2.5 py-1 transition-colors ${
              active
                ? 'text-white'
                : 'text-ink-soft hover:text-ink'
            }`}
            style={{
              background: active ? 'var(--qw-gold)' : 'transparent',
            }}
          >
            {LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
