/**
 * 爬虫调度器 - 三层降级主入口
 * 层1 Firecrawl → 层2 Playwright → 层3 AI 推断
 */

import type { ScrapeResult } from '@/types/scrape';
import { scrapeWithFirecrawl } from './firecrawl';
import { scrapeWithPlaywright } from './playwright';
import { detectThirdPartyServices } from '@/lib/analyzer/third-party-detector';
import { getSignatures } from '@/lib/platform-admin/signatures-config';

export interface ScrapeOptions {
  url: string;
  screenshot?: boolean;
  fullPage?: boolean;
  cookieString?: string;
}

export async function scrape(options: ScrapeOptions): Promise<ScrapeResult> {
  const { url, screenshot = true, fullPage = true } = options;

  // 加载特征库（平台管理后台可在线编辑，数据库优先）
  const signatures = await getSignatures();

  let result: ScrapeResult;

  try {
    const headers: Record<string, string> = {};
    if (options.cookieString) headers.Cookie = options.cookieString;
    result = await scrapeWithFirecrawl({
      url,
      screenshot,
      fullPage,
      waitFor: 3000,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    });
    result.detectedServices = detectThirdPartyServices(
      result.html,
      result.networkRequests,
      signatures
    );
    return result;
  } catch (err) {
    console.warn('[Scraper] Layer 1 Firecrawl failed:', err);
    try {
      result = await scrapeWithPlaywright({
        url,
        screenshot,
        fullPage,
        cookieString: options.cookieString,
        signatures,
      });
      return result;
    } catch (err2) {
      console.warn('[Scraper] Layer 2 Playwright failed:', err2);
      // 层3：AI 纯推断降级，基于 URL 推断页面结构
      result = buildLayer3Fallback(url);
      return result;
    }
  }
}

/**
 * 层3 降级：Firecrawl + Playwright 均失败时，返回最小数据集供 Claude 推断
 */
function buildLayer3Fallback(url: string): ScrapeResult {
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();
  return {
    url,
    html: `<body><div data-layer3-fallback="true"><!-- Layer 3: inferred from URL -->${domain}</div></body>`,
    markdown: `[Layer 3 fallback] URL: ${url}\nDomain: ${domain}\nNo HTML/markdown available from crawler. Infer structure from URL and domain.`,
    screenshot: '',
    assets: { images: [], fonts: [], icons: [] },
    networkRequests: [],
    detectedServices: [],
    scraperLayer: 3,
    scrapedAt: new Date(),
    partial: true,
  };
}
