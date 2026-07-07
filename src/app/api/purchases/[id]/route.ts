import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { updateMetrics } from '@/lib/metrics';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // Find existing purchase to calculate delta
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id },
      include: { payments: true }
    });

    if (!existingPurchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    const newTotalAmount = Number(body.totalAmount);
    const newPaidAmount = Number(body.paidAmount);
    const newDate = new Date(body.date);
    
    if (isNaN(newTotalAmount) || isNaN(newPaidAmount)) {
      return NextResponse.json({ error: 'Invalid amounts' }, { status: 400 });
    }

    const newDueAmount = newTotalAmount - newPaidAmount;

    const deltaTotal = newTotalAmount - existingPurchase.totalAmount;
    const deltaPaid = newPaidAmount - existingPurchase.paidAmount;
    const deltaDue = newDueAmount - existingPurchase.dueAmount;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update purchase
      const updatedPurchase = await tx.purchase.update({
        where: { id },
        data: {
          totalAmount: newTotalAmount,
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          date: newDate
        }
      });

      // 2. Adjust payments if paid amount changed
      if (deltaPaid !== 0) {
        // If they increased paid amount, add a new payment record or adjust existing?
        // Since we allow editing paidAmount directly, let's just log a balancing payment 
        // OR simply rely on the purchase's paidAmount. 
        // But SupplierPayment exists. Let's create an adjustment payment.
        await tx.supplierPayment.create({
          data: {
            supplierId: existingPurchase.supplierId,
            purchaseId: id,
            amount: deltaPaid,
          }
        });
      }

      // 3. Update Metrics
      const metrics = await tx.businessMetrics.findFirst();
      if (metrics) {
        await tx.businessMetrics.update({
          where: { id: metrics.id },
          data: {
            totalPurchase: { increment: deltaTotal },
            supplierDue: { increment: deltaDue },
            currentCash: { decrement: deltaPaid } // if paid more, cash decreases
          }
        });
      }

      return updatedPurchase;
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error updating purchase:", error);
    return NextResponse.json({ error: error.message || 'Failed to update purchase' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const existingPurchase = await prisma.purchase.findUnique({
      where: { id },
    });

    if (!existingPurchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Revert Metrics
      const metrics = await tx.businessMetrics.findFirst();
      if (metrics) {
        await tx.businessMetrics.update({
          where: { id: metrics.id },
          data: {
            totalPurchase: { decrement: existingPurchase.totalAmount },
            supplierDue: { decrement: existingPurchase.dueAmount },
            currentCash: { increment: existingPurchase.paidAmount } // return cash
          }
        });
      }

      // 2. Revert Product Stock for items
      const items = existingPurchase.items as any[];
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const qty = Number(item.quantity) || 0;
          if (qty > 0 && item.productName) {
            // Find product by exact name match (as saved during creation)
            const product = await tx.product.findFirst({
              where: { name: { equals: String(item.productName), mode: 'insensitive' } }
            });
            if (product) {
              await tx.product.update({
                where: { id: product.id },
                data: {
                  // @ts-ignore
                  stockQuantity: { decrement: qty }
                }
              });
            }
          }
        }
      }

      // 3. Delete Price History linked to this purchase
      // @ts-ignore
      await tx.productPriceHistory.deleteMany({
        where: { purchaseId: id }
      });

      // 4. Delete Payments linked to this purchase
      await tx.supplierPayment.deleteMany({
        where: { purchaseId: id }
      });

      // 5. Delete the Purchase
      const deletedPurchase = await tx.purchase.delete({
        where: { id }
      });

      // Log deletion
      await tx.activityLog.create({
        data: {
          userId,
          action: 'DELETED_PURCHASE',
          entity: 'Purchase',
          entityId: id,
        }
      });

      return deletedPurchase;
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json({ success: true, purchase: result });
  } catch (error: any) {
    console.error("Error deleting purchase:", error);
    return NextResponse.json({ error: error.message || 'Failed to delete purchase' }, { status: 500 });
  }
}
