import { PrismaClient } from '@prisma/client';

const ownerId = process.env.LEGACY_OWNER_ID;
if (!ownerId) {
  throw new Error('Set LEGACY_OWNER_ID to the Clerk user ID that owns the existing business data.');
}

const prisma = new PrismaClient();
const collections = [
  'Customer',
  'Supplier',
  'Product',
  'ProductPriceHistory',
  'Bill',
  'Purchase',
  'CustomerPayment',
  'SupplierPayment',
  'ActivityLog',
  'WholesaleRecord',
];

const metricFields = [
  'totalSales',
  'totalPurchase',
  'totalProfit',
  'totalExpenses',
  'customerDue',
  'supplierDue',
  'currentCash',
];

function isZeroMetric(metric) {
  return metricFields.every((field) => Number(metric[field] ?? 0) === 0);
}

function metricValues(metric) {
  return Object.fromEntries(metricFields.map((field) => [field, metric[field] ?? 0]));
}

try {
  for (const collection of collections) {
    await prisma.$runCommandRaw({
      update: collection,
      updates: [{
        q: { ownerId: { $exists: false } },
        u: { $set: { ownerId } },
        multi: true,
      }],
    });
  }

  const metricsResult = await prisma.$runCommandRaw({
    find: 'BusinessMetrics',
    filter: {},
    projection: { ownerId: 1, ...Object.fromEntries(metricFields.map((field) => [field, 1])) },
  });
  const metrics = metricsResult.cursor.firstBatch;
  const legacyMetrics = metrics.filter((metric) => !metric.ownerId);
  const ownedMetrics = metrics.filter((metric) => metric.ownerId === ownerId);

  if (legacyMetrics.length > 1 || ownedMetrics.length > 1) {
    throw new Error('Multiple BusinessMetrics summaries need manual reconciliation before migration.');
  }

  const legacyMetric = legacyMetrics[0];
  const ownedMetric = ownedMetrics[0];
  if (legacyMetric && ownedMetric) {
    if (!isZeroMetric(legacyMetric) && !isZeroMetric(ownedMetric)) {
      throw new Error('Both legacy and owner-scoped BusinessMetrics summaries contain values; reconcile them manually before migration.');
    }

    const duplicate = isZeroMetric(ownedMetric) ? ownedMetric : legacyMetric;
    await prisma.$runCommandRaw({
      delete: 'BusinessMetrics',
      deletes: [{
        q: duplicate === ownedMetric
          ? { ownerId, ...metricValues(ownedMetric) }
          : { ownerId: { $exists: false }, ...metricValues(legacyMetric) },
        limit: 1,
      }],
    });
  }

  if (legacyMetric && (!ownedMetric || isZeroMetric(ownedMetric))) {
    await prisma.$runCommandRaw({
      update: 'BusinessMetrics',
      updates: [{
        q: { ownerId: { $exists: false } },
        u: { $set: { ownerId } },
        multi: false,
      }],
    });
  }
  console.log(`Assigned legacy records to ${ownerId}. Run "npm run db:push" next.`);
} finally {
  await prisma.$disconnect();
}
