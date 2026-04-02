/**
 * 克隆任务类型定义
 * cloneType 用于 clone-worker 分支，为 APP 克隆预留
 */
export type CloneType = 'web' | 'app';

export type ComplexityLevel =
  | 'static_single'
  | 'static_multi'
  | 'dynamic_basic'
  | 'dynamic_complex';

export type CloneStatus =
  | 'queued'
  | 'scraping'
  | 'analyzing'
  | 'generating'
  | 'testing'
  | 'done'
  | 'failed'
  | 'reviewing';

export type DeliveryMode = 'download' | 'hosting';

export type TargetLanguage = 'original' | 'zh' | 'en';

export interface CloneTask {
  id: string;
  userId: string;
  cloneType: CloneType;
  targetUrl?: string | null;
  /** 仅内存传递，不持久化。用于内嵌浏览器提取的 Cookie */
  auth?: { mode: 'cookie'; cookieString: string };
  appUploadUrl?: string | null; // 第四阶段
  /** APK/流量模式：R2 中 APK 的 object key */
  appR2Key?: string | null;
  appAnalyzeMode?: 'screenshot' | 'apk' | 'traffic' | null; // 第四阶段
  /** 截图模式：base64 或 data URL 数组 */
  appScreenshots?: string[] | null;
  complexity: ComplexityLevel;
  creditsUsed: number;
  status: CloneStatus;
  deliveryMode: DeliveryMode;
  targetLanguage: TargetLanguage;
  scraperLayer?: 1 | 2 | 3 | null;
  scrapeResult?: unknown | null;
  analysisResult?: unknown | null;
  qualityScore?: number | null;
  retryCount?: number | null;
  downloadUrl?: string | null;
  previewUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
  /** Stripe 支付时用于退款 */
  stripePaymentIntentId?: string | null;
}

export interface CreateCloneRequest {
  url: string;
  cloneType: CloneType;
  deliveryMode: DeliveryMode;
  targetLanguage: TargetLanguage;
  complexity: ComplexityLevel;
  auth?: {
    mode: 'password' | 'cookie';
    username?: string;
    password?: string;
    loginUrl?: string;
    cookieString?: string;
  };
}
