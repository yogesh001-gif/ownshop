import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle, Clock } from 'lucide-react';
import AddSupplierPaymentForm from '@/components/AddSupplierPaymentForm';

export default async function PurchaseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      payments: {
        orderBy: { date: 'desc' }
      }
    }
  });

  if (!purchase) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Purchase Not Found</h2>
        <Link href="/suppliers" className="text-blue-600 hover:underline">Return to Suppliers</Link>
      </div>
    );
  }

  const isPaid = purchase.dueAmount <= 0;
  const isPartial = purchase.paidAmount > 0 && purchase.dueAmount > 0;
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/suppliers/${purchase.supplierId}`} className="p-2 bg-white rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Purchase Invoice Details
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Supplier: {purchase.supplier.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Date: {new Date(purchase.date).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
              isPaid ? 'bg-green-100 text-green-800' : 
              isPartial ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }`}>
              {isPaid ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {isPaid ? 'PAID' : isPartial ? 'PARTIALLY PAID' : 'UNPAID'}
            </span>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50 border-b border-gray-100">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
            <p className="text-sm font-medium text-gray-500 mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900">₹{purchase.totalAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
            <p className="text-sm font-medium text-gray-500 mb-1">Paid Amount</p>
            <p className="text-2xl font-bold text-green-600">₹{purchase.paidAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center border-l-4 border-l-red-500">
            <p className="text-sm font-medium text-gray-500 mb-1">Due Amount</p>
            <p className="text-2xl font-bold text-red-600">₹{purchase.dueAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Payment Action */}
        {!isPaid && (
          <div className="p-6 border-b border-gray-100 flex justify-end">
            <AddSupplierPaymentForm 
              supplierId={purchase.supplierId} 
              purchaseId={purchase.id} 
              dueAmount={purchase.dueAmount} 
            />
          </div>
        )}

        {/* Items List */}
        <div className="p-6 md:p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Purchased Items</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-900">Product Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Quantity</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Wholesale Rate</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {(purchase.items as any[]).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-gray-900">{item.productName}</td>
                    <td className="px-4 py-4 text-gray-600 text-right">{item.quantity}</td>
                    <td className="px-4 py-4 text-gray-600 text-right">₹{(item.rate || 0).toLocaleString()}</td>
                    <td className="px-4 py-4 font-medium text-gray-900 text-right">
                      ₹{((item.rate || 0) * (item.quantity || 1)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Photo Upload Note */}
        <div className="p-6 bg-blue-50/50 border-t border-blue-100 text-sm text-blue-800">
          <strong>Note about Scanned Invoice Photos:</strong> 
          <p className="mt-1">
            Currently, our AI extracts the data from the photo you upload and saves it directly to your database. The actual image file is not stored permanently to save server space and costs. If you need to view the original physical invoice, please check your local gallery or physical files.
          </p>
        </div>
      </div>
    </div>
  );
}
