import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Truck, FileImage, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PurchaseBillsPage() {
  const suppliers = await prisma.supplier.findMany({
    include: {
      purchases: {
        select: {
          id: true,
          invoiceImageUrl: true,
        },
      },
    },
    orderBy: { name: 'asc' }
  });

  // Filter suppliers to only show those that have at least one purchase with an image (or all purchases, up to you. Let's show all suppliers with their bill count)
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileImage className="h-6 w-6 text-blue-600" />
          Purchase Bills (Gallery)
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Select a Supplier</h3>
          <p className="text-sm text-gray-500 mt-1">View all uploaded invoice photos for each supplier.</p>
        </div>
        
        <div className="divide-y divide-gray-100">
          {suppliers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No suppliers found.
            </div>
          ) : (
            suppliers.map((supplier) => {
              const billsWithImages = supplier.purchases.filter(p => p.invoiceImageUrl).length;
              
              return (
                <Link
                  key={supplier.id}
                  href={`/purchase-bills/${supplier.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Truck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{supplier.name}</p>
                      <p className="text-sm text-gray-500">{supplier.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">{supplier.purchases.length} Total Purchases</p>
                      <p className="text-xs text-gray-500">{billsWithImages} Scanned Images</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
