/**
 * GET /api/platform-admin/finance
 * 财务报表数据（收入、成本、利润、退款、成本分项聚合）
 * ?format=csv 返回 CSV 导出
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/platform-admin/auth';
import {
  getFinanceSummary,
  getDailyFinance,
  getCostBreakdown,
} from '@/lib/platform-admin/cost-analytics';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') ?? '30';
    const format = searchParams.get('format');
    const days = Math.min(90, Math.max(1, parseInt(period, 10)));
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const [summary, daily, costBreakdown] = await Promise.all([
      getFinanceSummary(startStr, endStr),
      getDailyFinance(days),
      getCostBreakdown(startStr, endStr),
    ]);

    if (format === 'csv') {
      const header = '日期,收入($),成本($),利润($),退款($),任务数\n';
      const rows = daily
        .map(
          (r) =>
            `${r.date},${(r.revenueCents / 100).toFixed(2)},${(r.costCents / 100).toFixed(2)},${(r.profitCents / 100).toFixed(2)},${(r.refundCents / 100).toFixed(2)},${r.taskCount}`
        )
        .join('\n');
      const csv = header + rows;
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="finance-${startStr}-${endStr}.csv"`,
        },
      });
    }

    return NextResponse.json({
      summary: {
        totalRevenueCents: summary.totalRevenueCents,
        totalCostCents: summary.totalCostCents,
        totalProfitCents: summary.totalProfitCents,
        totalRefundCents: summary.totalRefundCents,
        taskCount: summary.taskCount,
      },
      costBreakdown,
      daily,
      period: days,
    });
  } catch (e) {
    console.error('[Platform Admin Finance GET]', e);
    return NextResponse.json({ error: 'Failed to load finance data' }, { status: 500 });
  }
}
