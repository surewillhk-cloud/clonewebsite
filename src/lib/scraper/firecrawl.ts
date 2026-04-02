/**
 * Firecrawl API 封装 - 爬虫层1
 */

import type { ScrapeResult } from '@/types/scrape';

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';

export interface FirecrawlScrapeOptions {
  url: string;
  screenshot?: boolean;
  fullPage?: boolean;
  waitFor?: number;
  headers?: Record<string, string>;
}

export interface FirecrawlResponse {
  success: boolean;
  data?: {
    html?: string;
    markdown?: string;
    screenshot?: string;
    metadata?: {
      title?: string;
      description?: string;
    };
  };
  error?: string;
}

export async function scrapeWithFirecrawl(
  opts: FirecrawlScrapeOptions
): Promise<ScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not set');
  }

  const formats = ['html', 'markdown', ...(opts.screenshot !== false ? ['screenshot'] : [])];
  const body: Record<string, unknown> = {
    url: opts.url,
    formats,
    ...(opts.waitFor ? { waitFor: opts.waitFor } : {}),
  };
  if (opts.headers && Object.keys(opts.headers).length > 0) {
    body.headers = opts.headers;
  }

  const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl API error: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as FirecrawlResponse;
  if (!json.success || !json.data) {
    throw new Error(json.error ?? 'Firecrawl scrape failed');
  }

  const { html = '', markdown = '', screenshot = '', metadata } = json.data;

  return {
    url: opts.url,
    html,
    markdown,
    screenshot: typeof screenshot === 'string' ? screenshot : '',
    assets: { images: [], fonts: [], icons: [] },
    networkRequests: [],
    detectedServices: [],
    scraperLayer: 1,
    scrapedAt: new Date(),
  };
}
