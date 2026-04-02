/**
 * 外部服务健康检查
 * Firecrawl、Claude、Stripe 可用性探测
 */

export interface HealthCheckResult {
  service: string;
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

const CACHE_KEY = 'webecho_health_cache';
const CACHE_TTL_MS = 60_000; // 1 分钟

interface CachedResult {
  ts: number;
  results: HealthCheckResult[];
}

let cached: CachedResult | null = null;

async function checkFirecrawl(): Promise<HealthCheckResult> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    return { service: 'Firecrawl', ok: false, error: '未配置 API Key' };
  }
  const start = Date.now();
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/health', {
      headers: { Authorization: `Bearer ${key}` },
    });
    const ok = res.ok;
    return {
      service: 'Firecrawl',
      ok,
      latencyMs: Date.now() - start,
      error: ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      service: 'Firecrawl',
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkClaude(): Promise<HealthCheckResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { service: 'Claude', ok: false, error: '未配置 API Key' };
  }
  const start = Date.now();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });
    const ok = res.ok || res.status === 400; // 400 可能只是参数问题，说明 API 可达
    return {
      service: 'Claude',
      ok,
      latencyMs: Date.now() - start,
      error: ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      service: 'Claude',
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkStripe(): Promise<HealthCheckResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { service: 'Stripe', ok: false, error: '未配置 API Key' };
  }
  const start = Date.now();
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
    });
    const ok = res.ok;
    return {
      service: 'Stripe',
      ok,
      latencyMs: Date.now() - start,
      error: ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      service: 'Stripe',
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * 执行全部健康检查
 */
export async function runHealthChecks(useCache: boolean = true): Promise<HealthCheckResult[]> {
  if (useCache && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.results;
  }
  const [firecrawl, claude, stripe] = await Promise.all([
    checkFirecrawl(),
    checkClaude(),
    checkStripe(),
  ]);
  const results = [firecrawl, claude, stripe];
  cached = { ts: Date.now(), results };
  return results;
}
