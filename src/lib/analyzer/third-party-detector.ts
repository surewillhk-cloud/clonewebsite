/**
 * 从 HTML 和网络请求中识别第三方服务
 * 支持传入自定义特征库（平台管理后台可在线编辑），否则使用 constants 默认
 */

import { SIGNATURES } from '@/constants/third-party-signatures';
import type { NetworkRequest } from '@/types/scrape';
import type { ServiceSignature } from '@/lib/platform-admin/signatures-config';

export function detectServicesFromHtml(
  html: string,
  signatures: Record<string, ServiceSignature> = SIGNATURES
): string[] {
  const found = new Set<string>();
  const lower = html.toLowerCase();

  for (const [name, sig] of Object.entries(signatures)) {
    if (sig.domains?.some((d) => lower.includes(d.toLowerCase()))) found.add(name);
    if (sig.scriptPatterns?.some((r) => r.test(html))) found.add(name);
    if (sig.classNames?.some((c) => lower.includes(`class="${c.toLowerCase()}`) || lower.includes(`class='${c.toLowerCase()}`))) found.add(name);
    if (sig.htmlPatterns?.some((r) => r.test(html))) found.add(name);
  }
  return Array.from(found);
}

export function detectServicesFromNetwork(
  requests: NetworkRequest[],
  signatures: Record<string, ServiceSignature> = SIGNATURES
): string[] {
  const found = new Set<string>();

  for (const req of requests) {
    const url = req.url.toLowerCase();
    for (const [name, sig] of Object.entries(signatures)) {
      if (sig.domains?.some((d) => url.includes(d.toLowerCase()))) found.add(name);
    }
  }
  return Array.from(found);
}

export function detectThirdPartyServices(
  html: string,
  networkRequests: NetworkRequest[] = [],
  signatures?: Record<string, ServiceSignature>
): string[] {
  const sigs = signatures ?? SIGNATURES;
  const fromHtml = detectServicesFromHtml(html, sigs);
  const fromNetwork = detectServicesFromNetwork(networkRequests, sigs);
  return Array.from(new Set([...fromHtml, ...fromNetwork]));
}
