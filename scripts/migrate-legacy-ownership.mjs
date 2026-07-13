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
  'BusinessMetrics',
  'WholesaleRecord',
];

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
  console.log(`Assigned legacy records to ${ownerId}. Run "npm run db:push" next.`);
} finally {
  await prisma.$disconnect();
}
