import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PrintButton from '@/components/PrintButton';
import AddPaymentForm from '@/components/AddPaymentForm';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const bill = await prisma.bill.findUnique({
    where: { id },
    include: { customer: true }
  });

  if (!bill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
          <Link href="/billing" className="text-blue-600 hover:underline">Return to Billing</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white flex flex-col items-center">
      <div className="w-full max-w-4xl mb-6 flex justify-between print:hidden gap-4">
        <Link href="/billing" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-lg shadow-sm transition-colors border border-gray-200">
          <ArrowLeft className="w-4 h-4" /> Back to Billing
        </Link>
        <div className="flex items-center gap-3">
          <AddPaymentForm billId={bill.id} customerId={bill.customerId} dueAmount={bill.dueAmount} />
          <PrintButton />
        </div>
      </div>

      <div className="bg-white w-full max-w-4xl p-12 shadow-md print:shadow-none print:w-full print:max-w-full print:p-0 rounded-xl">
        {/* Invoice Header */}
        <div className="flex justify-between border-b border-gray-200 pb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">INVOICE</h1>
            <p className="text-gray-500 mt-2 font-medium">OwnShop</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-900">{bill.invoiceNumber}</h2>
            <p className="text-gray-500 mt-1">Date: {new Date(bill.date).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mt-8 mb-10">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Billed To</h3>
          <p className="text-xl font-bold text-gray-900">{bill.customer.name}</p>
          <p className="text-gray-600 mt-1">Phone: +91 {bill.customer.phone}</p>
          {bill.customer.address && <p className="text-gray-600 mt-1 whitespace-pre-line">{bill.customer.address}</p>}
        </div>

        {/* Items Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-4 px-6 font-semibold text-gray-900">Product Description</th>
                <th className="py-4 px-6 font-semibold text-gray-900 text-right w-24">Qty</th>
                <th className="py-4 px-6 font-semibold text-gray-900 text-right w-32">Rate</th>
                <th className="py-4 px-6 font-semibold text-gray-900 text-right w-40">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bill.items.map((item: any, idx: number) => (
                <tr key={idx} className="bg-white">
                  <td className="py-4 px-6 text-gray-900 font-medium">{item.productName}</td>
                  <td className="py-4 px-6 text-gray-600 text-right">{item.quantity}</td>
                  <td className="py-4 px-6 text-gray-600 text-right">₹{item.rate.toLocaleString()}</td>
                  <td className="py-4 px-6 text-gray-900 font-semibold text-right">₹{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-8 flex justify-end">
          <div className="w-80 space-y-3">
            <div className="flex justify-between text-gray-600 px-4">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">₹{bill.totalAmount.toLocaleString()}</span>
            </div>
            {bill.discount > 0 && (
              <div className="flex justify-between text-gray-600 px-4">
                <span>Discount</span>
                <span className="font-medium text-red-600">- ₹{bill.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between bg-gray-50 px-4 py-3 rounded-lg mt-4">
              <span className="text-lg font-bold text-gray-900">Grand Total</span>
              <span className="text-lg font-black text-gray-900">₹{(bill.totalAmount - bill.discount).toLocaleString()}</span>
            </div>
            
            <div className="px-4 pt-4 space-y-2 border-t border-gray-100 mt-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Amount Paid</span>
                <span className="font-semibold text-green-600">₹{bill.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Balance Due</span>
                <span className={`font-semibold ${bill.dueAmount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  ₹{bill.dueAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Status */}
        <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-center text-sm">
          <div className="text-gray-500">
            <p>Thank you for your business!</p>
          </div>
          <div>
            Status: <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              bill.status === 'PAID' ? 'bg-green-100 text-green-800' : 
              bill.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }`}>
              {bill.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
