/**
 * URL 验证 - 防止 SSRF
 * 仅允许 http/https，禁止私有 IP、内网、云元数据地址
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',
  '169.254.169.254', // AWS/GCP/Azure 元数据
  'metadata.azure.com',
  'metadata.cloud.google.com',
]);

const PRIVATE_IP_OLD =
  /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|0\.|169\.254\.)/;

const IPV6_PRIVATE_PREFIXES = ['::1', '::', '::ffff:', 'fc', 'fd', 'fe80:', 'fe90:', 'fea0:', 'feb0:', '100:'];

function isPrivateIPv6(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return IPV6_PRIVATE_PREFIXES.some((prefix) => clean.startsWith(prefix));
}

export interface UrlValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * 校验 URL 是否安全（防 SSRF）
 * 仅允许 http/https，禁止私有地址
 */
export function validateScrapeUrl(urlStr: string): UrlValidationResult {
  try {
    const url = new URL(urlStr);
    const protocol = url.protocol?.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return { ok: false, error: 'Only http and https URLs are allowed' };
    }

    const hostname = (url.hostname ?? '').toLowerCase();
    if (BLOCKED_HOSTS.has(hostname)) {
      return { ok: false, error: 'Private or reserved addresses are not allowed' };
    }

    if (PRIVATE_IP_OLD.test(hostname)) {
      return { ok: false, error: 'Private IP ranges are not allowed' };
    }

    if (isPrivateIPv6(hostname)) {
      return { ok: false, error: 'IPv6 private or reserved addresses are not allowed' };
    }

    try {
      const hostIPv6 = hostname.replace(/^\[|\]$/g, '');
      if (hostIPv6 === '1' || hostIPv6 === '') {
        return { ok: false, error: 'Invalid IPv6 address' };
      }
    } catch {}

    return { ok: true };
  } catch {
    return { ok: false, error: 'Invalid URL format' };
  }
}
