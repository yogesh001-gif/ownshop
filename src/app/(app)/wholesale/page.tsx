import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Package } from 'lucide-react';

type LedgerRecord = {
  id: string;
  type: 'PURCHASE' | 'BILL_COGS';
  date: Date;
  entityName: string;
  entityLink: string;
  productName: string;
  quantity: number;
  wholesaleRate: number;
  totalCost: number;
};

export default async function WholesalePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const purchases = await prisma.purchase.findMany({
    where: { ownerId: userId },
    include: { supplier: true },
    orderBy: { date: 'desc' },
  });

  const billWholesale = await prisma.wholesaleRecord.findMany({
    where: { ownerId: userId },
    orderBy: { date: 'desc' },
  });

  const records: LedgerRecord[] = [
    ...purchases.flatMap((purchase) => purchase.items.map((item, index) => (
      {
        id: `purchase-${purchase.id}-${index}`,
        type: 'PURCHASE' as const,
        date: purchase.date,
        entityName: purchase.supplier.name,
        entityLink: `/suppliers/${purchase.supplierId}`,
        productName: item.productName,
        quantity: item.quantity,
        wholesaleRate: item.rate,
        totalCost: item.total,
      }
    ))),
    ...billWholesale.map((record) => ({
      id: `bill-${record.id}`,
      type: 'BILL_COGS' as const,
      date: record.date,
      entityName: 'Customer Bill',
      entityLink: `/invoice/${record.billId}`,
      productName: record.productName,
      quantity: record.quantity,
      wholesaleRate: record.wholesaleRate,
      totalCost: record.totalCost,
    })),
  ];

  // Sort combined records by date descending
  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-6 w-6 text-blue-600" />
          Wholesale Ledger
        </h2>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      record.type === 'PURCHASE' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {record.type === 'PURCHASE' ? 'Stock In (Purchase)' : 'Stock Out (Bill)'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600 hover:underline">
                    <a href={record.entityLink}>{record.entityName}</a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {record.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    ₹{record.wholesaleRate.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    ₹{record.totalCost.toLocaleString()}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No wholesale records found. Purchase items or generate customer bills to see them here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
