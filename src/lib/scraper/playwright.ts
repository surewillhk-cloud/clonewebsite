/**
 * Playwright 爬虫 - 层2 降级
 * Firecrawl 失败时使用，支持 Cookie、JS 渲染
 * 可选：配置 DECODO_USERNAME/DECODO_PASSWORD 时使用 Decodo 住宅代理
 */

import { chromium } from 'playwright';
import type { ScrapeResult } from '@/types/scrape';
import { detectThirdPartyServices } from '@/lib/analyzer/third-party-detector';
import { getDecodoProxy } from './decodo';
import type { ServiceSignature } from '@/lib/platform-admin/signatures-config';

export interface PlaywrightScrapeOptions {
  url: string;
  screenshot?: boolean;
  fullPage?: boolean;
  cookieString?: string;
  /** 第三方服务特征库（平台管理可编辑），不传则用默认 */
  signatures?: Record<string, ServiceSignature>;
}

export async function scrapeWithPlaywright(
  opts: PlaywrightScrapeOptions
): Promise<ScrapeResult> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const decodoProxy = getDecodoProxy();
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...(decodoProxy && { proxy: decodoProxy }),
    });

    if (opts.cookieString) {
      const domain = new URL(opts.url).hostname;
      const pairs = opts.cookieString.split(';').map((s) => s.trim());
      const cookies = pairs
        .filter((p) => p.includes('='))
        .map((p) => {
          const [name, ...v] = p.split('=');
          return {
            name: (name ?? '').trim(),
            value: v.join('=').trim(),
            domain: '.' + domain,
            path: '/',
          };
        });
      await context.addCookies(cookies);
    }

    const page = await context.newPage();
    const networkUrls: string[] = [];

    page.on('request', (req) => {
      networkUrls.push(req.url());
    });

    await page.goto(opts.url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await page.waitForTimeout(2000);

    const html = await page.content();
    const markdown = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 50000);

    let screenshot = '';
    if (opts.screenshot !== false) {
      const buf = await page.screenshot({
        type: 'jpeg',
        quality: 70,
        fullPage: opts.fullPage ?? true,
      });
      screenshot = `data:image/jpeg;base64,${buf.toString('base64')}`;
    }

    await browser.close();

    const networkRequests = networkUrls.slice(0, 200).map((url) => ({
      url,
      method: 'GET',
    }));
    const detectedServices = detectThirdPartyServices(
      html,
      networkRequests,
      opts.signatures
    );

    return {
      url: opts.url,
      html,
      markdown,
      screenshot,
      assets: { images: [], fonts: [], icons: [] },
      networkRequests,
      detectedServices,
      scraperLayer: 2,
      scrapedAt: new Date(),
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
