/**
 * 请求计时 - 记录超过 3 秒的慢请求
 * 通过包装 response body 在流结束时记录耗时
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { recordSlowRequest } from '@/lib/monitoring/slow-requests';

const SLOW_THRESHOLD_MS = 3000;
const SKIP_PATHS = [
  '/_next',
  '/favicon',
  '/og-image',
  '/robots.txt',
  '/sitemap.xml',
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.css',
  '.js',
  '.woff',
  '.woff2',
];

function shouldSkip(pathname: string): boolean {
  return SKIP_PATHS.some((p) => pathname.startsWith(p) || pathname.endsWith(p));
}

export function middleware(request: NextRequest) {
  const start = Date.now();
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  const response = NextResponse.next();

  if (!response.body || shouldSkip(pathname)) return response;

  const reader = response.body.getReader();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        const duration = Date.now() - start;
        if (duration >= SLOW_THRESHOLD_MS) {
          try {
            recordSlowRequest(pathname, method, duration);
            console.warn(`[slow] ${method} ${pathname} ${duration}ms`);
          } catch {
            // ignore
          }
        }
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     */
    '/((?!_next/static|_next/image).*)',
  ],
};
