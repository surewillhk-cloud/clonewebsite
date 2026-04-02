/**
 * Cookie 提取 - 从 Playwright Page 提取已登录 Session 的 Cookie
 */

import type { Page } from 'playwright';
import type { ExtractedCookies } from './types';

export async function extractSessionCookies(page: Page): Promise<ExtractedCookies> {
  const cookies = await page.context().cookies();
  const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const url = page.url();
  const domain = url ? new URL(url).hostname : '';

  return {
    raw: cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain ?? domain,
    })),
    cookieString,
    domain,
    extractedAt: new Date(),
  };
}
