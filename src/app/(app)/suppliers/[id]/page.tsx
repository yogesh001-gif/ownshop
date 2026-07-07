import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, Truck, Phone, MapPin, IndianRupee, FileText, CreditCard } from 'lucide-react';

import AddSupplierPaymentForm from '@/components/AddSupplierPaymentForm';
import SupplierActions from '@/components/SupplierActions';

export default async function SupplierDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchases: {
        orderBy: { date: 'desc' }
      },
      payments: {
        orderBy: { date: 'desc' }
      }
    }
  });

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Supplier Not Found</h2>
        <Link href="/suppliers" className="text-blue-600 hover:underline">Return to Suppliers</Link>
      </div>
    );
  }

  // Calculate totals
  const totalDue = supplier.purchases.reduce((acc: number, purchase: any) => acc + purchase.dueAmount, 0);
  const totalPaid = supplier.payments.reduce((acc: number, payment: any) => acc + payment.amount, 0);
  const totalPurchased = supplier.purchases.reduce((acc: number, purchase: any) => acc + purchase.totalAmount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/suppliers" className="p-2 bg-white rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Supplier Profile
        </h2>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Truck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{supplier.name}</h1>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-gray-500 text-sm">Supplier ID: {supplier.id}</p>
                <SupplierActions supplier={supplier} />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 mt-4 text-gray-600">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>+91 {supplier.phone}</span>
            </div>
            {supplier.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                <span className="whitespace-pre-line">{supplier.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Due Card Highlight */}
        <div className={`p-6 rounded-xl border-2 w-full md:w-72 flex flex-col items-center justify-center text-center ${totalDue > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
          <IndianRupee className={`w-8 h-8 mb-2 ${totalDue > 0 ? 'text-red-500' : 'text-green-500'}`} />
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">We Owe Them</p>
          <h2 className={`text-4xl font-black tracking-tight mb-4 ${totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{totalDue.toLocaleString()}
          </h2>
          <AddSupplierPaymentForm supplierId={supplier.id} purchaseId="" dueAmount={totalDue} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Purchase History Tab */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Purchase History
            </h3>
            <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
              Total: ₹{totalPurchased.toLocaleString()}
            </span>
          </div>
          <div className="overflow-y-auto max-h-[500px]">
            <table className="min-w-full text-left text-sm text-gray-600">
              <thead className="bg-white sticky top-0 border-b border-gray-100 z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-900">Purchase ID</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {supplier.purchases.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No purchases recorded yet.</td></tr>
                ) : (
                  supplier.purchases.map((purchase: any) => {
                    const status = purchase.dueAmount <= 0 ? 'PAID' : (purchase.paidAmount > 0 ? 'PARTIAL' : 'UNPAID');
                    
                    return (
                      <tr key={purchase.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 font-medium text-blue-600 hover:underline">
                          <Link href={`/purchases/${purchase.id}`}>View Purchase</Link>
                        </td>
                        <td className="px-4 py-4 text-gray-500">
                          {new Date(purchase.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-4 font-medium text-gray-900 text-right">
                          ₹{purchase.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            status === 'PAID' ? 'bg-green-100 text-green-800' : 
                            status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment History Tab */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Payment History
            </h3>
            <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
              Paid: ₹{totalPaid.toLocaleString()}
            </span>
          </div>
          <div className="overflow-y-auto max-h-[500px]">
            <table className="min-w-full text-left text-sm text-gray-600">
              <thead className="bg-white sticky top-0 border-b border-gray-100 z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Linked Purchase</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {supplier.payments.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No payments recorded yet.</td></tr>
                ) : (
                  supplier.payments.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-gray-500">
                        {new Date(payment.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {payment.purchaseId ? 'During purchase' : 'Manual Payment'}
                      </td>
                      <td className="px-4 py-4 font-bold text-green-600 text-right">
                        + ₹{payment.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
