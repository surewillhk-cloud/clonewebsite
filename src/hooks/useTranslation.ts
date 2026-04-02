'use client';

import { useLocale } from '@/contexts/LocaleContext';
import { getT } from '@/translations';

export function useTranslation() {
  const { locale } = useLocale();
  return getT(locale);
}
