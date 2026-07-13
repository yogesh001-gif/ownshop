import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ApiError, apiErrorResponse } from '@/lib/api-error';
import { updateMetrics } from '@/lib/metrics';
import { createPurchaseSchema, validationError } from '@/lib/validation';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const purchases = await prisma.purchase.findMany({
      where: { ownerId: userId },
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(purchases);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to fetch purchases');
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = createPurchaseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid purchase', details: validationError(parsed.error) }, { status: 400 });
    }

    const data = parsed.data;
    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const dueAmount = totalAmount - data.paidAmount;

    const purchase = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({ where: { id: data.supplierId, ownerId: userId } });
      if (!supplier) throw new ApiError('Supplier not found', 404);

      const created = await tx.purchase.create({
        data: {
          ownerId: userId,
          supplierId: supplier.id,
          date: data.date ?? new Date(),
          items: data.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            rate: item.rate,
            total: item.quantity * item.rate,
          })),
          totalAmount,
          paidAmount: data.paidAmount,
          dueAmount,
        },
      });

      if (data.paidAmount > 0) {
        await tx.supplierPayment.create({
          data: { ownerId: userId, amount: data.paidAmount, supplierId: supplier.id, purchaseId: created.id },
        });
      }

      for (const item of data.items) {
        let product = await tx.product.findFirst({
          where: { ownerId: userId, name: { equals: item.productName, mode: 'insensitive' } },
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              ownerId: userId,
              name: item.productName,
              currentPurchasePrice: item.rate,
              stockQuantity: item.quantity,
            },
          });
        } else {
          product = await tx.product.update({
            where: { id: product.id },
            data: {
              currentPurchasePrice: item.rate,
              stockQuantity: { increment: item.quantity },
            },
          });
        }

        await tx.productPriceHistory.create({
          data: { ownerId: userId, productId: product.id, purchaseId: created.id, price: item.rate },
        });
      }

      await updateMetrics(userId, {
        purchaseChange: totalAmount,
        cashChange: -data.paidAmount,
        supplierDueChange: dueAmount,
      }, tx);
      await tx.activityLog.create({
        data: {
          ownerId: userId,
          userId,
          action: 'CREATED_PURCHASE',
          entity: 'Purchase',
          entityId: created.id,
          newValue: JSON.stringify(created),
        },
      });
      return created;
    }, { maxWait: 10_000, timeout: 30_000 });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to create purchase');
  }
}
