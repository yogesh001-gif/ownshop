import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ApiError, apiErrorResponse } from '@/lib/api-error';
import { contactSchema, recordIdSchema, validationError } from '@/lib/validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const id = (await params).id;
    if (!recordIdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });
    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid supplier', details: validationError(parsed.error) }, { status: 400 });
    }

    const supplier = await prisma.$transaction(async (tx) => {
      const existing = await tx.supplier.findFirst({ where: { id, ownerId: userId } });
      if (!existing) throw new ApiError('Supplier not found', 404);
      const duplicate = await tx.supplier.findFirst({
        where: { ownerId: userId, phone: parsed.data.phone, NOT: { id } },
      });
      if (duplicate) throw new ApiError('A supplier with this phone number already exists', 409);
      const updated = await tx.supplier.update({ where: { id }, data: parsed.data });
      await tx.activityLog.create({
        data: { ownerId: userId, userId, action: 'UPDATED_SUPPLIER', entity: 'Supplier', entityId: id, newValue: JSON.stringify(updated) },
      });
      return updated;
    });

    return NextResponse.json(supplier);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update supplier');
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const id = (await params).id;
    if (!recordIdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });

    const supplier = await prisma.$transaction(async (tx) => {
      const existing = await tx.supplier.findFirst({ where: { id, ownerId: userId } });
      if (!existing) throw new ApiError('Supplier not found', 404);
      const [purchaseCount, paymentCount] = await Promise.all([
        tx.purchase.count({ where: { ownerId: userId, supplierId: id } }),
        tx.supplierPayment.count({ where: { ownerId: userId, supplierId: id } }),
      ]);
      if (purchaseCount > 0 || paymentCount > 0) {
        throw new ApiError('Cannot delete a supplier with associated purchases or payments', 400);
      }
      const deleted = await tx.supplier.delete({ where: { id } });
      await tx.activityLog.create({
        data: { ownerId: userId, userId, action: 'DELETED_SUPPLIER', entity: 'Supplier', entityId: id },
      });
      return deleted;
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to delete supplier');
  }
}
