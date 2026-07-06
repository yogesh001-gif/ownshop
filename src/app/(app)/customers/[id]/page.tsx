import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, User, Phone, MapPin, IndianRupee, FileText, CreditCard } from 'lucide-react';
// date-fns removed

export default async function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      bills: {
        orderBy: { date: 'desc' }
      },
      payments: {
        orderBy: { date: 'desc' }
      }
    }
  });

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Not Found</h2>
        <Link href="/customers" className="text-blue-600 hover:underline">Return to Customers</Link>
      </div>
    );
  }

  // Calculate totals
  const totalDue = customer.bills.reduce((acc: number, bill: any) => acc + bill.dueAmount, 0);
  const totalPaid = customer.payments.reduce((acc: number, payment: any) => acc + payment.amount, 0);
  const totalBilled = customer.bills.reduce((acc: number, bill: any) => acc + (bill.totalAmount - bill.discount), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers" className="p-2 bg-white rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Customer Profile
        </h2>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
              <p className="text-gray-500 text-sm mt-1">Customer ID: {customer.id}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 mt-4 text-gray-600">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>+91 {customer.phone}</span>
            </div>
            {customer.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                <span className="whitespace-pre-line">{customer.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Due Card Highlight */}
        <div className={`p-6 rounded-xl border-2 w-full md:w-72 flex flex-col items-center justify-center text-center ${totalDue > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
          <IndianRupee className={`w-8 h-8 mb-2 ${totalDue > 0 ? 'text-red-500' : 'text-green-500'}`} />
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">Current Due Amount</p>
          <h2 className={`text-4xl font-black tracking-tight ${totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{totalDue.toLocaleString()}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Bill History Tab */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Bill History
            </h3>
            <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
              Total: ₹{totalBilled.toLocaleString()}
            </span>
          </div>
          <div className="overflow-y-auto max-h-[500px]">
            <table className="min-w-full text-left text-sm text-gray-600">
              <thead className="bg-white sticky top-0 border-b border-gray-100 z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-900">Invoice</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customer.bills.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No bills generated yet.</td></tr>
                ) : (
                  customer.bills.map((bill: any) => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium text-blue-600 hover:underline">
                        <Link href={`/invoice/${bill.id}`}>{bill.invoiceNumber}</Link>
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {new Date(bill.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900 text-right">
                        ₹{(bill.totalAmount - bill.discount).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          bill.status === 'PAID' ? 'bg-green-100 text-green-800' : 
                          bill.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))
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
                  <th className="px-4 py-3 font-semibold text-gray-900">Linked Invoice</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customer.payments.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No payments recorded yet.</td></tr>
                ) : (
                  customer.payments.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-gray-500">
                        {new Date(payment.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {payment.billId ? 'Generated during billing' : 'Manual Payment'}
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
