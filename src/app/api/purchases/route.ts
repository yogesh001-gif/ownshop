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

    const totalAmt = Number(totalAmount) || 0;
    const paidAmt = Number(paidAmount) || 0;
    const dueAmt = totalAmt - paidAmt;

    // 1 & 2. Create Purchase and update Products inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Purchase
      const purchase = await tx.purchase.create({
        data: {
          supplierId,
          items,
          totalAmount: totalAmt,
          paidAmount: paidAmt,
          dueAmount: dueAmt,
        }
      });

      // Create Payment Record if paid
      if (paidAmt > 0) {
        await tx.supplierPayment.create({
          data: {
            amount: paidAmt,
            supplierId,
            purchaseId: purchase.id,
          }
        });
      }

      // Update Products, Inventory, and Price History
      for (const item of (items || [])) {
        const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
        const rt = Number(item.rate) || 0;
        const pName = String(item.productName || 'Unknown Product').trim();

        let product = await tx.product.findFirst({
          where: { name: { equals: pName, mode: 'insensitive' } }
        });

        if (!product) {
          product = await tx.product.create({
            data: {
              name: pName,
              // @ts-ignore
              currentPurchasePrice: rt,
              // @ts-ignore
              stockQuantity: qty
            }
          });
        } else {
          await tx.product.update({
            where: { id: product.id },
            data: {
              // @ts-ignore
              currentPurchasePrice: rt,
              // @ts-ignore
              stockQuantity: { increment: qty }
            }
          });
        }

        // Log the price history
        // @ts-ignore
        await tx.productPriceHistory.create({
          data: {
            productId: product.id,
            purchaseId: purchase.id,
            price: rt,
          }
        });
      }
      
      return purchase;
    }, {
      maxWait: 10000,
      timeout: 30000
    });

    // 4. Update Metrics
    await updateMetrics({
      purchaseChange: totalAmt,
      cashChange: -paidAmt,
      supplierDueChange: dueAmt,
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
  } catch (error: any) {
    console.error("Purchase Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to create purchase' }, { status: 500 });
  }
}
