import type { Locale } from '@/contexts/LocaleContext';
import { zh } from './zh';
import { en } from './en';

export type Translations = typeof zh;

const translations = { zh, en } as unknown as Record<Locale, Translations>;

export function getT(locale: Locale): Translations {
  return translations[locale] ?? zh;
}

export { zh, en };
