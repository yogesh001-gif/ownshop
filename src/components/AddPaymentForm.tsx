'use client';

import { useState } from 'react';
import { IndianRupee } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AddPaymentFormProps {
  billId: string;
  customerId: string;
  dueAmount: number;
}

export default function AddPaymentForm({ billId, customerId, dueAmount }: AddPaymentFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (dueAmount <= 0) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0 || amount > dueAmount) {
      alert("Invalid payment amount");
      return;
    }

    setLoading(true);
    const res = await fetch('/api/payments/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, billId, amount })
    });

    if (res.ok) {
      setIsOpen(false);
      setAmount('');
      router.refresh();
    } else {
      alert("Failed to record payment");
    }
    setLoading(false);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
      >
        <IndianRupee className="w-4 h-4" /> Add Payment
      </button>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div>
          <label className="sr-only">Payment Amount</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm">₹</span>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              max={dueAmount}
              className="block w-32 rounded-lg border-0 py-1.5 pl-7 pr-4 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
              placeholder="Amount"
              autoFocus
            />
          </div>
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button 
          type="button" 
          onClick={() => setIsOpen(false)}
          className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
