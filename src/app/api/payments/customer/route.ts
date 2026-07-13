import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ApiError, apiErrorResponse } from '@/lib/api-error';
import { updateMetrics } from '@/lib/metrics';
import { customerPaymentSchema, validationError } from '@/lib/validation';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = customerPaymentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payment', details: validationError(parsed.error) }, { status: 400 });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findFirst({
        where: { id: parsed.data.billId, ownerId: userId, customerId: parsed.data.customerId },
      });
      if (!bill) throw new ApiError('Bill not found for this customer', 404);
      if (parsed.data.amount > bill.dueAmount) throw new ApiError('Payment exceeds the bill’s outstanding balance', 400);

      const newPaidAmount = bill.paidAmount + parsed.data.amount;
      const newDueAmount = bill.dueAmount - parsed.data.amount;
      const created = await tx.customerPayment.create({
        data: { ownerId: userId, customerId: bill.customerId, billId: bill.id, amount: parsed.data.amount },
      });
      await tx.bill.update({
        where: { id: bill.id },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          status: newDueAmount === 0 ? 'PAID' : 'PARTIAL',
        },
      });
      await updateMetrics(userId, { cashChange: parsed.data.amount, customerDueChange: -parsed.data.amount }, tx);
      await tx.activityLog.create({
        data: { ownerId: userId, userId, action: 'CUSTOMER_PAYMENT', entity: 'CustomerPayment', entityId: created.id, newValue: JSON.stringify(created) },
      });
      return created;
    }, { maxWait: 10_000, timeout: 30_000 });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to process payment');
  }
}
