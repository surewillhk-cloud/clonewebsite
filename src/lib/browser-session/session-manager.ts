/**
 * 内嵌浏览器 Session 生命周期管理
 * - 创建 Playwright 实例、导航、超时回收
 */

import { chromium } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import type { BrowserSession, SessionPurpose } from './types';
import { stopPreviewServer } from '@/lib/preview-server';

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_SESSIONS_PER_USER = 2;
const MAX_TOTAL_SESSIONS = 50;

const sessions = new Map<string, BrowserSession>();

function countByUser(userId: string): number {
  let count = 0;
  for (const s of sessions.values()) {
    if (s.userId === userId && s.status === 'active') count++;
  }
  return count;
}

export async function createSession(
  userId: string,
  targetUrl: string,
  purpose: SessionPurpose,
  options?: { taskId?: string }
): Promise<BrowserSession> {
  if (countByUser(userId) >= MAX_SESSIONS_PER_USER) {
    throw new Error('MAX_SESSIONS_PER_USER');
  }
  if (sessions.size >= MAX_TOTAL_SESSIONS) {
    throw new Error('MAX_TOTAL_SESSIONS');
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  const now = new Date();
  const sessionId = uuidv4();

  const session: BrowserSession = {
    sessionId,
    userId,
    targetUrl,
    purpose,
    taskId: options?.taskId,
    browser,
    page,
    createdAt: now,
    lastActiveAt: now,
    status: 'active',
  };

  sessions.set(sessionId, session);

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (err) {
    console.warn('[browser-session] Navigate timeout/error, continuing:', err);
  }

  return session;
}

export function getSession(sessionId: string): BrowserSession | undefined {
  return sessions.get(sessionId);
}

export async function destroySession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;

  sessions.delete(sessionId);
  if (session.purpose === 'preview' && session.taskId) {
    stopPreviewServer(session.taskId).catch((err) =>
      console.warn('[browser-session] stopPreviewServer:', err)
    );
  }
  try {
    await session.browser.close();
  } catch (err) {
    console.warn('[browser-session] Close browser error:', err);
  }
}

export function touchSession(sessionId: string): void {
  const s = sessions.get(sessionId);
  if (s) s.lastActiveAt = new Date();
}

export async function gcIdleSessions(): Promise<number> {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, s] of sessions.entries()) {
    if (now - s.lastActiveAt.getTime() > SESSION_TIMEOUT_MS) {
      await destroySession(id);
      cleaned++;
    }
  }
  return cleaned;
}
