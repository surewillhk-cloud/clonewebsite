/**
 * 临时 Auth 缓存 - 用于 Stripe 支付流程中传递 Cookie
 * Cookie 不落库，10 分钟后自动过期
 */

const TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  cookieString: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function gc() {
  const now = Date.now();
  for (const [k, v] of cache.entries()) {
    if (v.expiresAt < now) cache.delete(k);
  }
}

export function set(token: string, cookieString: string): void {
  gc();
  cache.set(token, {
    cookieString,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function get(token: string): string | null {
  const entry = cache.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(token);
    return null;
  }
  return entry.cookieString;
}

export function del(token: string): void {
  cache.delete(token);
}
