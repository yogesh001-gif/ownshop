import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ApiError, apiErrorResponse } from '@/lib/api-error';
import { updateMetrics } from '@/lib/metrics';
import { createBillSchema, validationError } from '@/lib/validation';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const bills = await prisma.bill.findMany({
      where: { ownerId: userId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(bills);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to fetch bills');
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = createBillSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid bill', details: validationError(parsed.error) }, { status: 400 });
    }

    const data = parsed.data;
    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const dueAmount = totalAmount - data.discount - data.paidAmount;
    const status = dueAmount === 0 ? 'PAID' : data.paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

    const bill = await prisma.$transaction(async (tx) => {
      let customerId = data.customerId;
      if (customerId) {
        const customer = await tx.customer.findFirst({ where: { id: customerId, ownerId: userId } });
        if (!customer) throw new ApiError('Customer not found', 404);
      } else {
        const existing = await tx.customer.findFirst({
          where: { ownerId: userId, phone: data.customerPhone! },
        });
        customerId = existing?.id ?? (await tx.customer.create({
          data: { ownerId: userId, name: data.customerName!, phone: data.customerPhone! },
        })).id;
      }

      const year = new Date().getFullYear();
      const counter = await tx.invoiceCounter.upsert({
        where: { ownerId_year: { ownerId: userId, year } },
        update: { nextNumber: { increment: 1 } },
        create: { ownerId: userId, year, nextNumber: 1 },
      });
      const invoiceNumber = `INV-${year}-${counter.nextNumber.toString().padStart(4, '0')}`;

      let totalProfit = 0;
      const items = [] as Array<{
        productName: string;
        quantity: number;
        rate: number;
        total: number;
        purchaseRate: number;
        profit: number;
      }>;

      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: { ownerId: userId, name: { equals: item.productName, mode: 'insensitive' } },
        });
        if (!product) throw new ApiError(`Product “${item.productName}” does not exist`, 400);
        if (product.stockQuantity < item.quantity) {
          throw new ApiError(`Insufficient stock for “${item.productName}”`, 400);
        }

        const purchaseRate = product.currentPurchasePrice;
        const profit = (item.rate - purchaseRate) * item.quantity;
        totalProfit += profit;
        items.push({
          productName: product.name,
          quantity: item.quantity,
          rate: item.rate,
          total: item.quantity * item.rate,
          purchaseRate,
          profit,
        });

        await tx.product.update({
          where: { id: product.id },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      const created = await tx.bill.create({
        data: {
          ownerId: userId,
          invoiceNumber,
          customerId: customerId!,
          items,
          totalAmount,
          totalProfit,
          discount: data.discount,
          paidAmount: data.paidAmount,
          dueAmount,
          status,
        },
      });

      for (const item of items) {
        await tx.wholesaleRecord.create({
          data: {
            ownerId: userId,
            productName: item.productName,
            quantity: item.quantity,
            wholesaleRate: item.purchaseRate,
            totalCost: item.purchaseRate * item.quantity,
            billId: created.id,
          },
        });
      }

      if (data.paidAmount > 0) {
        await tx.customerPayment.create({
          data: { ownerId: userId, amount: data.paidAmount, customerId: customerId!, billId: created.id },
        });
      }

      await updateMetrics(userId, {
        salesChange: totalAmount - data.discount,
        cashChange: data.paidAmount,
        customerDueChange: dueAmount,
        profitChange: totalProfit,
      }, tx);

      await tx.activityLog.create({
        data: {
          ownerId: userId,
          userId,
          action: 'CREATED_BILL',
          entity: 'Bill',
          entityId: created.id,
          newValue: JSON.stringify(created),
        },
      });

      return created;
    }, { maxWait: 10_000, timeout: 30_000 });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to create bill');
  }
}
