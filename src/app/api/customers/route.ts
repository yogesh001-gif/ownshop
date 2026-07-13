import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ApiError, apiErrorResponse } from '@/lib/api-error';
import { contactSchema, validationError } from '@/lib/validation';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const search = new URL(request.url).searchParams.get('search')?.trim();
    const customers = await prisma.customer.findMany({
      where: {
        ownerId: userId,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(customers);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to fetch customers');
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = contactSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid customer', details: validationError(parsed.error) }, { status: 400 });
    }

    const customer = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.customer.findFirst({
        where: { ownerId: userId, phone: parsed.data.phone },
      });
      if (duplicate) throw new ApiError('A customer with this phone number already exists', 409);

      const created = await tx.customer.create({ data: { ownerId: userId, ...parsed.data } });
      await tx.activityLog.create({
        data: { ownerId: userId, userId, action: 'CREATED_CUSTOMER', entity: 'Customer', entityId: created.id, newValue: JSON.stringify(created) },
      });
      return created;
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to create customer');
  }
}
