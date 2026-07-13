'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, ShoppingCart, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const purchaseItemSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  quantity: z.number().min(1),
  rate: z.number().min(0),
});

const purchaseSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
  paidAmount: z.number().min(0),
});

type PurchaseForm = z.infer<typeof purchaseSchema>;
type SupplierOption = { id: string; name: string; phone: string };

function isSupplierOption(value: unknown): value is SupplierOption {
  return typeof value === 'object' && value !== null &&
    typeof (value as SupplierOption).id === 'string' &&
    typeof (value as SupplierOption).name === 'string' &&
    typeof (value as SupplierOption).phone === 'string';
}

export default function Purchases() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  useEffect(() => {
    fetch('/api/suppliers')
      .then((res) => res.json() as Promise<unknown>)
      .then((data) => setSuppliers(Array.isArray(data) ? data.filter(isSupplierOption) : []))
      .catch(() => {});
  }, []);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<PurchaseForm>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplierId: '',
      items: [{ productName: '', quantity: 1, rate: 0 }],
      paidAmount: 0
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchItems = useWatch({ control, name: 'items' }) ?? [];
  const watchPaid = useWatch({ control, name: 'paidAmount' }) ?? 0;

  const totalAmount = watchItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.rate || 0)), 0);
  const dueAmount = totalAmount - watchPaid;

  const onSubmit = async (data: PurchaseForm) => {
    setLoading(true);
    
    const res = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 3000);
    } else {
      const errData = await res.json().catch(() => ({}));
      alert(`Failed to add purchase: ${errData.error || 'Unknown error'}`);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-purple-600" />
          Add Purchase
        </h2>
        <Link
          href="/purchases/scan"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
        >
          <Camera className="w-4 h-4" />
          <span className="hidden sm:inline">Smart Scan</span>
        </Link>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 p-4 border border-green-200">
          <p className="text-sm font-medium text-green-800">Purchase added successfully!</p>
        </div>
      )}

      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Supplier Details</h3>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Supplier</label>
              <select {...register('supplierId')} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-purple-500 focus:ring-purple-500 bg-white">
                <option value="">-- Select Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                ))}
              </select>
              {errors.supplierId && <p className="text-red-500 text-xs mt-1">{errors.supplierId.message}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Products</h3>
              <button
                type="button"
                onClick={() => append({ productName: '', quantity: 1, rate: 0 })}
                className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add Item
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 px-2 hidden md:grid">
                <div className="col-span-5">Product Name</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Purchase Rate (₹)</div>
                <div className="col-span-2">Total</div>
                <div className="col-span-1"></div>
              </div>

              {fields.map((field, index) => {
                const qty = watchItems[index]?.quantity || 0;
                const rate = watchItems[index]?.rate || 0;
                const total = qty * rate;

                return (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-gray-50 p-3 rounded-lg md:bg-transparent md:p-0 md:rounded-none">
                    <div className="col-span-1 md:col-span-5">
                      <label className="block text-xs text-gray-500 md:hidden mb-1">Product Name</label>
                      <input {...register(`items.${index}.productName`)} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-purple-500 focus:ring-purple-500" placeholder="E.g. Cotton Shirt" />
                      {errors.items?.[index]?.productName && <p className="text-red-500 text-xs mt-1">{errors.items[index]?.productName?.message}</p>}
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs text-gray-500 md:hidden mb-1">Quantity</label>
                      <input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-purple-500 focus:ring-purple-500" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs text-gray-500 md:hidden mb-1">Rate (₹)</label>
                      <input type="number" {...register(`items.${index}.rate`, { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-purple-500 focus:ring-purple-500" />
                    </div>
                    <div className="col-span-1 md:col-span-2 pt-2 md:pt-0 font-medium text-gray-900">
                      <span className="md:hidden text-xs text-gray-500 font-normal mr-2">Total:</span>
                      ₹{total.toLocaleString()}
                    </div>
                    <div className="col-span-1 flex justify-end md:justify-center">
                      <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="w-full md:w-1/2 ml-auto space-y-4">
              <div className="flex justify-between items-center text-gray-600">
                <span>Total Amount</span>
                <span className="font-medium text-gray-900">₹{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Paid Amount (₹)</span>
                <input type="number" {...register('paidAmount', { valueAsNumber: true })} className="w-32 rounded-lg border-gray-300 border px-3 py-1 text-right focus:border-purple-500 focus:ring-purple-500" />
              </div>
              <div className="flex justify-between items-center border-t pt-4">
                <span className="text-lg font-bold text-gray-900">Due Amount</span>
                <span className={`text-xl font-bold ${dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{dueAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-purple-600 px-8 py-3 text-sm font-bold text-white hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
