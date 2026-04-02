/**
 * 慢请求内存存储
 * 记录最近 N 条超过阈值的请求，供平台管理后台查看
 */

export interface SlowRequestEntry {
  path: string;
  method: string;
  durationMs: number;
  timestamp: string;
}

const MAX_ENTRIES = 50;
const THRESHOLD_MS = 3000;

const store: SlowRequestEntry[] = [];

/**
 * 添加慢请求记录
 */
export function recordSlowRequest(
  path: string,
  method: string,
  durationMs: number
): void {
  if (durationMs < THRESHOLD_MS) return;
  const entry: SlowRequestEntry = {
    path,
    method,
    durationMs,
    timestamp: new Date().toISOString(),
  };
  store.unshift(entry);
  if (store.length > MAX_ENTRIES) {
    store.length = MAX_ENTRIES;
  }
}

/**
 * 获取最近慢请求列表
 */
export function getSlowRequests(limit: number = 30): SlowRequestEntry[] {
  return store.slice(0, limit);
}
