/**
 * APP 界面分析结果类型
 * 用于 screenshot-analyzer → rn-component-generator
 */

export interface AppScreenBlock {
  type: string;
  title: string;
  description: string;
}

export interface AppScreen {
  name: string;
  blocks: AppScreenBlock[];
}

export interface AppScreenAnalysis {
  screens: AppScreen[];
  colorTheme: { primary?: string; background?: string; text?: string };
  navigationType: 'tabs' | 'stack' | 'drawer';
  platform: 'android' | 'ios';
  /** 流量抓包模式：捕获的 API 端点列表，用于生成 API 调用代码 */
  apiEndpoints?: ApiEndpoint[];
}

/** 流量抓包捕获的 API 端点（来自 mitmproxy HAR/JSON） */
export interface ApiEndpoint {
  url: string;
  method: string;
  path: string;
  queryParams?: Record<string, string>;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  responseStatus?: number;
  /** Claude 推断的友好名称，如 getProductList */
  inferredName?: string;
}
