import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-error';
import { updateMetrics } from '@/lib/metrics';
import { confirmPurchaseSchema, validationError } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = confirmPurchaseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid scanned purchase', details: validationError(parsed.error) }, { status: 400 });
    }

    const data = parsed.data;
    const dueAmount = data.totalAmount - data.paidAmount;
    const purchase = await prisma.$transaction(async (tx) => {
      let supplier = await tx.supplier.findFirst({
        where: { ownerId: userId, name: { equals: data.supplierName, mode: 'insensitive' } },
      });
      if (!supplier) {
        supplier = await tx.supplier.create({
          data: {
            ownerId: userId,
            name: data.supplierName,
            phone: data.supplierPhone ?? `AUTO-${crypto.randomUUID()}`,
          },
        });
      }

      const created = await tx.purchase.create({
        data: {
          ownerId: userId,
          supplierId: supplier.id,
          date: data.invoiceDate ?? new Date(),
          supplierInvoiceNumber: data.invoiceNumber ?? null,
          invoiceImageUrl: data.invoiceImageUrl ?? null,
          items: [],
          totalAmount: data.totalAmount,
          paidAmount: data.paidAmount,
          dueAmount,
        },
      });

      if (data.paidAmount > 0) {
        await tx.supplierPayment.create({
          data: { ownerId: userId, supplierId: supplier.id, purchaseId: created.id, amount: data.paidAmount },
        });
      }

      await updateMetrics(userId, {
        purchaseChange: data.totalAmount,
        supplierDueChange: dueAmount,
        cashChange: -data.paidAmount,
      }, tx);
      await tx.activityLog.create({
        data: { ownerId: userId, userId, action: 'CREATED_SCANNED_PURCHASE', entity: 'Purchase', entityId: created.id },
      });
      return created;
    }, { maxWait: 10_000, timeout: 30_000 });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to confirm purchase');
  }
}
