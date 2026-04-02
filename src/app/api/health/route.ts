/**
 * GET /api/health
 * 公开健康检查（供 uptime 监控使用）
 * 仅检查服务是否可响应，不暴露内部状态
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { ok: true, timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
