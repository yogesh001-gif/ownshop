import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'all';

    let dateFilter = {};
    const now = new Date();
    
    if (range === 'today') {
      const start = new Date(now.setHours(0,0,0,0));
      dateFilter = { gte: start };
    } else if (range === 'week') {
      const start = new Date(now.setDate(now.getDate() - now.getDay()));
      start.setHours(0,0,0,0);
      dateFilter = { gte: start };
    } else if (range === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { gte: start };
    } else if (range === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      dateFilter = { gte: start };
    }

    const dateQuery = range === 'all' ? {} : { createdAt: dateFilter };

    const bills = await prisma.bill.findMany({ where: dateQuery });
    const purchases = await prisma.purchase.findMany({ where: dateQuery });
    
    const totalSales = bills.reduce((acc, bill) => acc + (bill.totalAmount - bill.discount), 0);
    const totalPurchase = purchases.reduce((acc, p) => acc + p.totalAmount, 0);
    const totalProfit = totalSales * 0.2; // 20% mock profit margin for MVP
    
    // For dues, we always show current outstanding dues, ignoring date range (as due is a current state)
    // Alternatively, we could calculate due from bills in the date range. Let's return both range metrics and overall dues.
    const metrics = await prisma.businessMetrics.findFirst();

    return NextResponse.json({
      rangeSales: totalSales,
      rangePurchase: totalPurchase,
      rangeProfit: totalProfit,
      customerDue: metrics?.customerDue || 0,
      supplierDue: metrics?.supplierDue || 0,
      currentCash: metrics?.currentCash || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
