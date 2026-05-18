import { cookies } from 'next/headers';
import { Wizard } from '@/components/wizard/Wizard';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALES,
  type Locale,
} from '@/lib/i18n/dictionary';

export default async function Home() {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  const initialLocale: Locale = LOCALES.includes(raw as Locale)
    ? (raw as Locale)
    : DEFAULT_LOCALE;
  return <Wizard initialLocale={initialLocale} />;
}
