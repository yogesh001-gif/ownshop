import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateMetrics } from '@/lib/metrics';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const metrics = await getOrCreateMetrics();
    
    // Fetch recent activities
    const recentActivities = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Fetch recent bills
    const recentBills = await prisma.bill.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      metrics,
      recentActivities,
      recentBills,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
