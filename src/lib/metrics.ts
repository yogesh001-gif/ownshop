import prisma from './prisma';

export async function getOrCreateMetrics() {
  const metrics = await prisma.businessMetrics.findFirst();
  if (metrics) return metrics;

  return await prisma.businessMetrics.create({
    data: {
      totalSales: 0,
      totalPurchase: 0,
      totalProfit: 0,
      totalExpenses: 0,
      customerDue: 0,
      supplierDue: 0,
      currentCash: 0,
    }
  });
}

export async function updateMetrics(data: {
  salesChange?: number;
  purchaseChange?: number;
  profitChange?: number;
  customerDueChange?: number;
  supplierDueChange?: number;
  cashChange?: number;
}) {
  const metrics = await getOrCreateMetrics();
  
  return await prisma.businessMetrics.update({
    where: { id: metrics.id },
    data: {
      totalSales: { increment: data.salesChange || 0 },
      totalPurchase: { increment: data.purchaseChange || 0 },
      totalProfit: { increment: data.profitChange || 0 },
      customerDue: { increment: data.customerDueChange || 0 },
      supplierDue: { increment: data.supplierDueChange || 0 },
      currentCash: { increment: data.cashChange || 0 },
    }
  });
}
