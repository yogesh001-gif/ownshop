import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    // 1. Resolve Supplier (Create if not exists)
    let supplier;
    if (data.supplierName) {
      // Very basic match by name, a better system would use IDs or phone numbers
      supplier = await prisma.supplier.findFirst({
        where: { name: { equals: data.supplierName, mode: 'insensitive' } }
      });
      
      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: {
            name: data.supplierName,
            phone: `AUTO-${Date.now()}` // Needs a phone number due to unique constraint, creating a dummy one
          }
        });
      }
    } else {
      return NextResponse.json({ error: 'Supplier Name is required' }, { status: 400 });
    }

    // Calculate Due Amount safely
    const totalAmount = Number(data.totalAmount) || 0;
    const paidAmount = Number(data.paidAmount) || 0;
    const dueAmount = totalAmount - paidAmount;

    // 2. Start a transaction for Purchase and Products
    const result = await prisma.$transaction(async (tx) => {
      // 2a. Create Purchase
      const purchase = await tx.purchase.create({
        data: {
          supplierId: supplier.id,
          totalAmount,
          paidAmount,
          dueAmount,
          items: (data.items || []).map((item: any) => {
            const qty = Math.max(1, Number(item.quantity) || 1); // fallback to 1
            const rt = Number(item.rate) || 0;
            return {
              productName: String(item.productName || 'Unknown Product').trim(),
              quantity: qty,
              rate: rt,
              total: qty * rt
            };
          }),
        }
      });

      // 2b. If paidAmount > 0, create a payment record
      if (paidAmount > 0) {
        await tx.supplierPayment.create({
          data: {
            supplierId: supplier.id,
            purchaseId: purchase.id,
            amount: paidAmount
          }
        });
      }

      // 2c. Update Products and Price History
      for (const item of (data.items || [])) {
        const qty = Math.max(1, Number(item.quantity) || 1);
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

      // 2d. Log Activity
      await tx.activityLog.create({
        data: {
          userId,
          action: 'CREATED_PURCHASE',
          entity: 'Purchase',
          entityId: purchase.id
        }
      });

      // 2e. Update Business Metrics
      const metrics = await tx.businessMetrics.findFirst();
      if (metrics) {
        await tx.businessMetrics.update({
          where: { id: metrics.id },
          data: {
            totalPurchase: { increment: totalAmount },
            supplierDue: { increment: dueAmount },
            currentCash: { decrement: paidAmount }
          }
        });
      } else {
        await tx.businessMetrics.create({
          data: {
            totalPurchase: totalAmount,
            supplierDue: dueAmount,
            currentCash: -paidAmount
          }
        });
      }

      return purchase;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Confirmation Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to confirm purchase' }, { status: 500 });
  }
}