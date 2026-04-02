/**
 * 爬虫模块类型定义
 */

export interface AssetItem {
  url: string;
  localPath: string;
  type: 'image' | 'font' | 'icon';
}

export interface NetworkRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ScrapeResult {
  url: string;
  html: string;
  markdown: string;
  screenshot: string; // R2 URL 或 base64
  assets: {
    images: AssetItem[];
    fonts: AssetItem[];
    icons: AssetItem[];
  };
  networkRequests: NetworkRequest[];
  detectedServices: string[];
  scraperLayer: 1 | 2 | 3;
  scrapedAt: Date;
  partial?: boolean; // 层3 降级时可能为 true
}
