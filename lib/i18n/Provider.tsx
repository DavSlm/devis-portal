'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  type Locale,
  type Translations,
  getDictionary,
  interpolate,
} from './dictionary';

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  dict: Translations;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

/** Accède à `obj.path.foo.bar` via une string « path.foo.bar ». */
function lookup(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    // 1 an, path racine pour couvrir tout le site.
    if (typeof document !== 'undefined') {
      document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    }
  }, []);

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const v = lookup(dict, path);
      if (typeof v !== 'string') {
        // Clé manquante → renvoie la clé pour debug visuel.
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[i18n] missing key: ${path} (locale=${locale})`);
        }
        return path;
      }
      return interpolate(v, vars);
    },
    [dict, locale],
  );

  const value: I18nContextValue = { locale, setLocale, t, dict };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useT() must be used inside <I18nProvider>');
  }
  return ctx;
}
