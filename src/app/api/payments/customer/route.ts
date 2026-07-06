import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { updateMetrics } from '@/lib/metrics';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { customerId, billId, amount } = body;

    if (!customerId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment details' }, { status: 400 });
    }

    const payment = await prisma.customerPayment.create({
      data: {
        customerId,
        billId,
        amount,
      }
    });

    if (billId) {
      const bill = await prisma.bill.findUnique({ where: { id: billId } });
      if (bill) {
        const newPaidAmount = bill.paidAmount + amount;
        const newDueAmount = bill.totalAmount - bill.discount - newPaidAmount;
        await prisma.bill.update({
          where: { id: billId },
          data: {
            paidAmount: newPaidAmount,
            dueAmount: newDueAmount,
            status: newDueAmount <= 0 ? 'PAID' : 'PARTIAL'
          }
        });
      }
    }

    await updateMetrics({
      cashChange: amount,
      customerDueChange: -amount,
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CUSTOMER_PAYMENT',
        entity: 'CustomerPayment',
        entityId: payment.id,
        newValue: JSON.stringify(payment),
      }
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}
