import prisma from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, Calendar, IndianRupee, Image as ImageIcon } from 'lucide-react';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SupplierPurchaseBillsPage({ params }: { params: Promise<{ supplierId: string }> }) {
  const { supplierId } = await params;
  
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    // @ts-ignore
    include: {
      purchases: {
        where: {
          // @ts-ignore
          invoiceImageUrl: { not: null }
        },
        orderBy: { date: 'desc' }
      }
    }
  });

  if (!supplier) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/purchase-bills" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{supplier.name}</h2>
          <p className="text-sm text-gray-500">Purchase Bills Gallery</p>
        </div>
      </div>

      {/* @ts-ignore */}
      {supplier.purchases.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No scanned bills found</h3>
          <p className="text-gray-500">Invoices uploaded via Smart Scan will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* @ts-ignore */}
          {supplier.purchases.map((purchase: any) => (
            <div key={purchase.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <a href={purchase.invoiceImageUrl!} target="_blank" rel="noopener noreferrer" className="relative group block h-48 bg-gray-100 overflow-hidden">
                <img 
                  src={purchase.invoiceImageUrl!} 
                  alt="Invoice" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-medium bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">View Full Image</span>
                </div>
              </a>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500 gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(purchase.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-lg font-bold text-gray-900 gap-1">
                    <IndianRupee className="w-4 h-4" />
                    {purchase.totalAmount.toLocaleString()}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                  <span className="text-gray-500">Paid: ₹{purchase.paidAmount.toLocaleString()}</span>
                  <span className={purchase.dueAmount > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                    Due: ₹{purchase.dueAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
