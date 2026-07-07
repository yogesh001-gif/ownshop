import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { updateMetrics } from '@/lib/metrics';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const purchases = await prisma.purchase.findMany({
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(purchases);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { supplierId, items, totalAmount, paidAmount } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json({ error: 'Supplier and items are required' }, { status: 400 });
    }

    const dueAmount = totalAmount - paidAmount;

    // 1 & 2. Create Purchase and update Products inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Purchase
      const purchase = await tx.purchase.create({
        data: {
          supplierId,
          items,
          totalAmount,
          paidAmount,
          dueAmount,
        }
      });

      // Create Payment Record if paid
      if (paidAmount > 0) {
        await tx.supplierPayment.create({
          data: {
            amount: paidAmount,
            supplierId,
            purchaseId: purchase.id,
          }
        });
      }

      // Update Products, Inventory, and Price History
      for (const item of items) {
        let product = await tx.product.findFirst({
          where: { name: { equals: item.productName, mode: 'insensitive' } }
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              name: item.productName,
              // @ts-ignore
              currentPurchasePrice: item.rate,
              // @ts-ignore
              stockQuantity: item.quantity
            }
          });
        } else {
          await tx.product.update({
            where: { id: product.id },
            data: {
              // @ts-ignore
              currentPurchasePrice: item.rate,
              // @ts-ignore
              stockQuantity: { increment: item.quantity }
            }
          });
        }

        // Log the price history
        // @ts-ignore
        await tx.productPriceHistory.create({
          data: {
            productId: product.id,
            purchaseId: purchase.id,
            price: item.rate,
          }
        });
      }
      
      return purchase;
    });

    // 4. Update Metrics
    await updateMetrics({
      purchaseChange: totalAmount,
      cashChange: -paidAmount,
      supplierDueChange: dueAmount,
    });

    // 5. Log Activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CREATED_PURCHASE',
        entity: 'Purchase',
        entityId: result.id,
        newValue: JSON.stringify(result),
      }
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 });
  }
}
