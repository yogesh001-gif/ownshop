import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-error';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const activities = await prisma.activityLog.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(activities);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to fetch activity log');
  }
}
