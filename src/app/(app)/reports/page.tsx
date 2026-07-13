'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';

type ReportData = {
  rangeSales: number;
  rangePurchase: number;
  rangeProfit: number;
  customerDue: number;
  supplierDue: number;
  currentCash: number;
};

function isReportData(value: unknown): value is ReportData {
  return typeof value === 'object' && value !== null &&
    ['rangeSales', 'rangePurchase', 'rangeProfit', 'customerDue', 'supplierDue', 'currentCash']
      .every((key) => typeof (value as Record<string, unknown>)[key] === 'number');
}

export default function Reports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('today');

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/reports?range=${range}`);
        const responseData: unknown = await response.json();
        setData(isReportData(responseData) ? responseData : null);
      } finally {
        setLoading(false);
      }
    };
    void loadReport();
  }, [range]);

  const ranges = [
    { id: 'today', name: 'Today' },
    { id: 'week', name: 'This Week' },
    { id: 'month', name: 'This Month' },
    { id: 'year', name: 'This Year' },
    { id: 'all', name: 'All Time' },
  ];

  const netPosition = (data?.currentCash || 0) + (data?.customerDue || 0) - (data?.supplierDue || 0);

  const reportCards = [
    { name: "Total Sales", value: data?.rangeSales, icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    { name: "Total Purchase", value: data?.rangePurchase, icon: IndianRupee, color: "text-purple-600", bg: "bg-purple-100" },
    { name: "Estimated Profit", value: data?.rangeProfit, icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-100" },
  ];

  const overallCards = [
    { name: "Customer Due", value: data?.customerDue, color: "text-orange-600" },
    { name: "Supplier Due", value: data?.supplierDue, color: "text-red-600" },
    { name: "Cash Available", value: data?.currentCash, color: "text-blue-600" },
    { name: "Net Position", value: netPosition, color: netPosition >= 0 ? "text-green-600" : "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          Business Reports
        </h2>
        
        <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          {ranges.map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                range === r.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Period Metrics ({ranges.find(r => r.id === range)?.name})</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {reportCards.map((stat, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={stat.name}
                  className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl p-3 ${stat.bg}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">₹{stat.value?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Standing</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {overallCards.map((stat, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  key={stat.name}
                  className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
                >
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>₹{stat.value?.toLocaleString() || 0}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
