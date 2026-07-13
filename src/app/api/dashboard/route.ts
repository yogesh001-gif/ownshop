import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-error';
import { getOrCreateMetrics } from '@/lib/metrics';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [metrics, recentActivities, recentBills] = await Promise.all([
      getOrCreateMetrics(userId),
      prisma.activityLog.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.bill.findMany({
        where: { ownerId: userId },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
    return NextResponse.json({ metrics, recentActivities, recentBills });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to fetch dashboard data');
  }
}
