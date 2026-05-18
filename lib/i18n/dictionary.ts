// =====================================================
// Dictionnaire i18n — wizard public seulement.
// Pas de dépendance externe (next-intl, react-intl…) : on garde le
// bundle léger pour ~150 strings.
// =====================================================

export type Locale = 'fr' | 'en';
export const LOCALES: Locale[] = ['fr', 'en'];
export const DEFAULT_LOCALE: Locale = 'fr';

export const LOCALE_COOKIE = 'devis_locale';

/**
 * Structure récursive : chaque feuille est une string, chaque noeud
 * intermédiaire est un sous-dictionnaire. EN et FR partagent le type
 * pour rester alignés sur les mêmes clés.
 */
export interface Translations {
  header: {
    tagline: string;
    logoAlt: string;
  };
  nav: {
    previous: string;
    next: string;
    submit: string;
  };
  sidebar: {
    title: string;
    progress_step: string;
    upcoming_placeholder: string;
  };
}

export const fr: Translations = {
  header: {
    tagline: 'Devis personnalisé',
    logoAlt: 'Oshibori Concept',
  },
  nav: {
    previous: 'Précédent',
    next: 'Suivant',
    submit: 'Envoyer ma demande',
  },
  sidebar: {
    title: 'Votre devis',
    progress_step: 'Étape {current} sur {total}',
    upcoming_placeholder: '—',
  },
};

export const en: Translations = {
  header: {
    tagline: 'Custom quote',
    logoAlt: 'Oshibori Concept',
  },
  nav: {
    previous: 'Previous',
    next: 'Next',
    submit: 'Submit my request',
  },
  sidebar: {
    title: 'Your quote',
    progress_step: 'Step {current} of {total}',
    upcoming_placeholder: '—',
  },
};

const DICTIONARIES: Record<Locale, Translations> = { fr, en };

export function getDictionary(locale: Locale): Translations {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/** Récupère une string en remplaçant les placeholders `{name}`. */
export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : `{${k}}`,
  );
}
