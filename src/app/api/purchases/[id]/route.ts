import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ApiError, apiErrorResponse } from '@/lib/api-error';
import { updateMetrics } from '@/lib/metrics';
import { purchaseUpdateSchema, recordIdSchema, validationError } from '@/lib/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const id = (await params).id;
    if (!recordIdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid purchase id' }, { status: 400 });
    const parsed = purchaseUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid purchase', details: validationError(parsed.error) }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.purchase.findFirst({ where: { id, ownerId: userId } });
      if (!existing) throw new ApiError('Purchase not found', 404);
      if (parsed.data.paidAmount < existing.paidAmount) {
        throw new ApiError('Paid amount cannot be reduced. Record a correction separately.', 400);
      }

      const dueAmount = parsed.data.totalAmount - parsed.data.paidAmount;
      const paidDelta = parsed.data.paidAmount - existing.paidAmount;
      const updatedPurchase = await tx.purchase.update({
        where: { id: existing.id },
        data: {
          totalAmount: parsed.data.totalAmount,
          paidAmount: parsed.data.paidAmount,
          dueAmount,
          date: parsed.data.date,
        },
      });

      if (paidDelta > 0) {
        await tx.supplierPayment.create({
          data: { ownerId: userId, supplierId: existing.supplierId, purchaseId: existing.id, amount: paidDelta },
        });
      }

      await updateMetrics(userId, {
        purchaseChange: parsed.data.totalAmount - existing.totalAmount,
        supplierDueChange: dueAmount - existing.dueAmount,
        cashChange: -paidDelta,
      }, tx);
      await tx.activityLog.create({
        data: { ownerId: userId, userId, action: 'UPDATED_PURCHASE', entity: 'Purchase', entityId: existing.id, newValue: JSON.stringify(updatedPurchase) },
      });
      return updatedPurchase;
    }, { maxWait: 10_000, timeout: 30_000 });

    return NextResponse.json(updated);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update purchase');
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const id = (await params).id;
    if (!recordIdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid purchase id' }, { status: 400 });

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.purchase.findFirst({ where: { id, ownerId: userId } });
      if (!existing) throw new ApiError('Purchase not found', 404);

      for (const item of existing.items) {
        const product = await tx.product.findFirst({
          where: { ownerId: userId, name: { equals: item.productName, mode: 'insensitive' } },
        });
        if (product) {
          await tx.product.update({ where: { id: product.id }, data: { stockQuantity: { decrement: item.quantity } } });
        }
      }

      await tx.productPriceHistory.deleteMany({ where: { ownerId: userId, purchaseId: existing.id } });
      await tx.supplierPayment.deleteMany({ where: { ownerId: userId, purchaseId: existing.id } });
      const removed = await tx.purchase.delete({ where: { id: existing.id } });
      await updateMetrics(userId, {
        purchaseChange: -existing.totalAmount,
        supplierDueChange: -existing.dueAmount,
        cashChange: existing.paidAmount,
      }, tx);
      await tx.activityLog.create({
        data: { ownerId: userId, userId, action: 'DELETED_PURCHASE', entity: 'Purchase', entityId: existing.id },
      });
      return removed;
    }, { maxWait: 10_000, timeout: 30_000 });

    return NextResponse.json({ success: true, purchase: deleted });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to delete purchase');
  }
}
