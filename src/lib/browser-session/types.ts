/**
 * 内嵌浏览器 Session 类型定义
 */

import type { Browser, Page } from 'playwright';

export type SessionPurpose = 'login' | 'preview';
export type SessionStatus = 'active' | 'login_detected' | 'closed';

export interface BrowserSession {
  sessionId: string;
  userId: string;
  targetUrl: string;
  purpose: SessionPurpose;
  taskId?: string; // purpose=preview 时关联的克隆任务 ID，用于关闭时清理预览服务器
  browser: Browser;
  page: Page;
  createdAt: Date;
  lastActiveAt: Date;
  status: SessionStatus;
}

export interface ExtractedCookies {
  raw: Array<{ name: string; value: string; domain: string }>;
  cookieString: string;
  domain: string;
  extractedAt: Date;
}

export interface LoginStatus {
  isLoggedIn: boolean;
  confidence: 'high' | 'medium' | 'uncertain';
  detectedUserElement?: string;
}

export interface ActionPayload {
  type: 'click' | 'keypress' | 'scroll' | 'navigate';
  x?: number;
  y?: number;
  key?: string;
  deltaY?: number;
  url?: string;
}
