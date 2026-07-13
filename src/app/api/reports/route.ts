import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-error';
import { getOrCreateMetrics } from '@/lib/metrics';

function startOfRange(range: string): Date | undefined {
  const now = new Date();
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'week') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    return start;
  }
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === 'year') return new Date(now.getFullYear(), 0, 1);
  return undefined;
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const range = new URL(request.url).searchParams.get('range') ?? 'all';
    const start = startOfRange(range);
    const dateFilter: Prisma.DateTimeFilter | undefined = start ? { gte: start } : undefined;
    const where = { ownerId: userId, ...(dateFilter ? { date: dateFilter } : {}) };

    const [bills, purchases, metrics] = await Promise.all([
      prisma.bill.findMany({ where, select: { totalAmount: true, discount: true, totalProfit: true } }),
      prisma.purchase.findMany({ where, select: { totalAmount: true } }),
      getOrCreateMetrics(userId),
    ]);

    return NextResponse.json({
      rangeSales: bills.reduce((sum, bill) => sum + bill.totalAmount - bill.discount, 0),
      rangePurchase: purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0),
      rangeProfit: bills.reduce((sum, bill) => sum + bill.totalProfit, 0),
      customerDue: metrics.customerDue,
      supplierDue: metrics.supplierDue,
      currentCash: metrics.currentCash,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to fetch reports');
  }
}
