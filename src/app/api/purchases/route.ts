import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { updateMetrics } from '@/lib/metrics';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const purchases = await prisma.purchase.findMany({
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(purchases);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { supplierId, items, totalAmount, paidAmount } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Supplier and items are required' }, { status: 400 });
    }

    const dueAmount = totalAmount - paidAmount;

    // 1. Create Products (upsert)
    for (const item of items) {
      await prisma.product.upsert({
        where: { name: item.productName },
        update: {},
        create: { name: item.productName }
      });
    }

    // 2. Create Purchase
    const purchase = await prisma.purchase.create({
      data: {
        supplierId,
        items,
        totalAmount,
        paidAmount,
        dueAmount,
      }
    });

    // 3. Create Payment Record if paid
    if (paidAmount > 0) {
      await prisma.supplierPayment.create({
        data: {
          amount: paidAmount,
          supplierId,
          purchaseId: purchase.id,
        }
      });
    }

    // 4. Update Metrics
    await updateMetrics({
      purchaseChange: totalAmount,
      cashChange: -paidAmount,
      supplierDueChange: dueAmount,
    });

    // 5. Log Activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CREATED_PURCHASE',
        entity: 'Purchase',
        entityId: purchase.id,
        newValue: JSON.stringify(purchase),
      }
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 });
  }
}
