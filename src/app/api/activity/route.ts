import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activities = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // fetch latest 100
    });

    return NextResponse.json(activities);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 });
  }
}
