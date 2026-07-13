import { Prisma, PrismaClient } from '@prisma/client';
import prisma from './prisma';

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export type MetricChanges = {
  salesChange?: number;
  purchaseChange?: number;
  profitChange?: number;
  customerDueChange?: number;
  supplierDueChange?: number;
  cashChange?: number;
};

export async function getOrCreateMetrics(ownerId: string, client: PrismaExecutor = prisma) {
  return client.businessMetrics.upsert({
    where: { ownerId },
    update: {},
    create: { ownerId },
  });
}

export async function updateMetrics(
  ownerId: string,
  changes: MetricChanges,
  client: PrismaExecutor = prisma,
) {
  return client.businessMetrics.upsert({
    where: { ownerId },
    update: {
      totalSales: { increment: changes.salesChange ?? 0 },
      totalPurchase: { increment: changes.purchaseChange ?? 0 },
      totalProfit: { increment: changes.profitChange ?? 0 },
      customerDue: { increment: changes.customerDueChange ?? 0 },
      supplierDue: { increment: changes.supplierDueChange ?? 0 },
      currentCash: { increment: changes.cashChange ?? 0 },
    },
    create: {
      ownerId,
      totalSales: changes.salesChange ?? 0,
      totalPurchase: changes.purchaseChange ?? 0,
      totalProfit: changes.profitChange ?? 0,
      customerDue: changes.customerDueChange ?? 0,
      supplierDue: changes.supplierDueChange ?? 0,
      currentCash: changes.cashChange ?? 0,
    },
  });
}
