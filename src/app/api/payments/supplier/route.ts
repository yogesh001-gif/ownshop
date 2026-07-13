import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ApiError, apiErrorResponse } from '@/lib/api-error';
import { updateMetrics } from '@/lib/metrics';
import { supplierPaymentSchema, validationError } from '@/lib/validation';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = supplierPaymentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payment', details: validationError(parsed.error) }, { status: 400 });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: parsed.data.purchaseId, ownerId: userId, supplierId: parsed.data.supplierId },
      });
      if (!purchase) throw new ApiError('Purchase not found for this supplier', 404);
      if (parsed.data.amount > purchase.dueAmount) throw new ApiError('Payment exceeds the purchase’s outstanding balance', 400);

      const newPaidAmount = purchase.paidAmount + parsed.data.amount;
      const newDueAmount = purchase.dueAmount - parsed.data.amount;
      const created = await tx.supplierPayment.create({
        data: { ownerId: userId, supplierId: purchase.supplierId, purchaseId: purchase.id, amount: parsed.data.amount },
      });
      await tx.purchase.update({
        where: { id: purchase.id },
        data: { paidAmount: newPaidAmount, dueAmount: newDueAmount },
      });
      await updateMetrics(userId, { cashChange: -parsed.data.amount, supplierDueChange: -parsed.data.amount }, tx);
      await tx.activityLog.create({
        data: { ownerId: userId, userId, action: 'SUPPLIER_PAYMENT', entity: 'SupplierPayment', entityId: created.id, newValue: JSON.stringify(created) },
      });
      return created;
    }, { maxWait: 10_000, timeout: 30_000 });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to process payment');
  }
}
