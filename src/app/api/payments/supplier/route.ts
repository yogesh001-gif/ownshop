import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { updateMetrics } from '@/lib/metrics';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { supplierId, purchaseId, amount } = body;

    if (!supplierId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment details' }, { status: 400 });
    }

    const payment = await prisma.supplierPayment.create({
      data: {
        supplierId,
        purchaseId,
        amount,
      }
    });

    if (purchaseId) {
      const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
      if (purchase) {
        const newPaidAmount = purchase.paidAmount + amount;
        const newDueAmount = purchase.totalAmount - newPaidAmount;
        await prisma.purchase.update({
          where: { id: purchaseId },
          data: {
            paidAmount: newPaidAmount,
            dueAmount: newDueAmount,
          }
        });
      }
    }

    await updateMetrics({
      cashChange: -amount,
      supplierDueChange: -amount,
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'SUPPLIER_PAYMENT',
        entity: 'SupplierPayment',
        entityId: payment.id,
        newValue: JSON.stringify(payment),
      }
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
