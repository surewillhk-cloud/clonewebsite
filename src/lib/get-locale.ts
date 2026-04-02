/**
 * 服务端获取当前语言（从 Cookie 读取）
 */

import { cookies } from 'next/headers';
import type { Locale } from '@/contexts/LocaleContext';

const COOKIE_NAME = 'ch007-locale';

export async function getLocaleFromRequest(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  return value === 'en' ? 'en' : 'zh';
}
