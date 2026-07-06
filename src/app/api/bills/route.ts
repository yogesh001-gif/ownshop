import { NextResponse } from 'next/server'; // IDE type refresh
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { updateMetrics } from '@/lib/metrics';
import { BillStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const bills = await prisma.bill.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 50, // simple pagination for MVP
    });

    return NextResponse.json(bills);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { customerId, customerName, customerPhone, items, totalAmount, discount = 0, paidAmount } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }

    const dueAmount = totalAmount - discount - paidAmount;
    let status: BillStatus = 'UNPAID';
    if (dueAmount <= 0) status = 'PAID';
    else if (paidAmount > 0) status = 'PARTIAL';

    let finalCustomerId = customerId;

    // 1. Resolve Customer
    if (!finalCustomerId) {
      if (!customerName || !customerPhone) {
        return NextResponse.json({ error: 'Customer details required' }, { status: 400 });
      }
      const existingCustomer = await prisma.customer.findUnique({ where: { phone: customerPhone } });
      if (existingCustomer) {
        finalCustomerId = existingCustomer.id;
      } else {
        const newCustomer = await prisma.customer.create({
          data: { name: customerName, phone: customerPhone }
        });
        finalCustomerId = newCustomer.id;
      }
    }

    // 2. Generate Invoice Number
    const count = await prisma.bill.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    // 3. Create Products (upsert) & Calculate Wholesale
    let totalWholesaleCost = 0;
    const sanitizedItems = [];
    
    for (const item of items) {
      await prisma.product.upsert({
        where: { name: item.productName },
        update: {},
        create: { name: item.productName }
      });
      
      const qty = item.quantity || 1;
      const wsRate = item.wholesaleRate || 0;
      totalWholesaleCost += qty * wsRate;
      
      const { wholesaleRate, ...rest } = item;
      sanitizedItems.push(rest);
    }

    // 4. Create Bill
    const bill = await prisma.bill.create({
      data: {
        invoiceNumber,
        customerId: finalCustomerId,
        items: sanitizedItems,
        totalAmount,
        discount,
        paidAmount,
        dueAmount,
        status,
      }
    });

    // 4.5 Save Wholesale Records
    for (const item of items) {
      if (item.wholesaleRate && item.wholesaleRate > 0) {
        // @ts-ignore - IDE TS Server cache issue (Prisma types are updated in build)
        await prisma.wholesaleRecord.create({
          data: {
            productName: item.productName,
            quantity: item.quantity || 1,
            wholesaleRate: item.wholesaleRate,
            totalCost: (item.quantity || 1) * item.wholesaleRate,
            billId: bill.id
          }
        });
      }
    }

    // 5. Create Payment Record if paid
    if (paidAmount > 0) {
      await prisma.customerPayment.create({
        data: {
          amount: paidAmount,
          customerId: finalCustomerId,
          billId: bill.id,
        }
      });
    }

    // 6. Update Metrics
    const actualRevenue = totalAmount - discount;
    let profit = actualRevenue - totalWholesaleCost;
    if (totalWholesaleCost === 0) {
      profit = actualRevenue * 0.2; // MVP placeholder fallback
    }
    await updateMetrics({
      salesChange: totalAmount - discount,
      cashChange: paidAmount,
      customerDueChange: dueAmount,
      profitChange: profit,
    });

    // 7. Log Activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CREATED_BILL',
        entity: 'Bill',
        entityId: bill.id,
        newValue: JSON.stringify(bill),
      }
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 });
  }
}
