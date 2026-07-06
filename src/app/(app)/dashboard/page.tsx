'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  IndianRupee, 
  TrendingUp, 
  Wallet, 
  Users, 
  Truck, 
  Scale,
  PlusCircle,
  FileText,
  ShoppingCart,
  UserPlus,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const m = data?.metrics || {};
  const netPosition = m.currentCash + m.customerDue - m.supplierDue;

  const stats = [
    { name: "Total Sales", value: m.totalSales, icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    { name: "Total Profit", value: m.totalProfit, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-100" },
    { name: "Current Cash", value: m.currentCash, icon: Wallet, color: "text-blue-600", bg: "bg-blue-100" },
    { name: "Customer Due", value: m.customerDue, icon: Users, color: "text-orange-600", bg: "bg-orange-100" },
    { name: "Supplier Due", value: m.supplierDue, icon: Truck, color: "text-red-600", bg: "bg-red-100" },
    { name: "Net Position", value: netPosition, icon: Scale, color: netPosition >= 0 ? "text-green-600" : "text-red-600", bg: netPosition >= 0 ? "bg-green-100" : "bg-red-100" },
  ];

  const quickActions = [
    { name: "Create Bill", icon: FileText, href: "/billing", color: "bg-blue-600 hover:bg-blue-700" },
    { name: "Receive Payment", icon: IndianRupee, href: "/customers", color: "bg-green-600 hover:bg-green-700" },
    { name: "Add Purchase", icon: ShoppingCart, href: "/purchases", color: "bg-purple-600 hover:bg-purple-700" },
    { name: "Add Customer", icon: UserPlus, href: "/customers", color: "bg-orange-600 hover:bg-orange-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Business Overview</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.name}
            className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className={`rounded-xl p-3 ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">{stat.name}</dt>
                  <dd className="text-2xl font-bold text-gray-900 mt-1">₹{stat.value?.toLocaleString() || 0}</dd>
                </dl>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickActions.map((action, idx) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              key={action.name}
            >
              <Link
                href={action.href}
                className={`flex items-center justify-center space-x-2 rounded-xl p-4 text-white shadow-sm transition-all hover:-translate-y-1 ${action.color}`}
              >
                <action.icon className="h-5 w-5" />
                <span className="font-medium">{action.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Bills */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Bills</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data?.recentBills?.map((bill: any) => (
                <div key={bill.id} className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-900">{bill.customer?.name || 'Walk-in Customer'}</p>
                    <p className="text-sm text-gray-500">{bill.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₹{bill.totalAmount.toLocaleString()}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      bill.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                      bill.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'
                    }`}>
                      {bill.status}
                    </span>
                  </div>
                </div>
              ))}
              {!data?.recentBills?.length && <p className="text-gray-500 text-center py-4">No recent bills</p>}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {data?.recentActivities?.map((activity: any) => (
                <div key={activity.id} className="flex items-start">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 ring-8 ring-white">
                    <Activity className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm text-gray-900">
                      {activity.action.replace('_', ' ')}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {!data?.recentActivities?.length && <p className="text-gray-500 text-center py-4">No recent activity</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
