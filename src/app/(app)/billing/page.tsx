'use client';

import { useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const billItemSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  quantity: z.number().min(1),
  rate: z.number().min(0),
  wholesaleRate: z.number().min(0).optional(),
});

const billSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerPhone: z.string().min(10, "Valid phone is required"),
  items: z.array(billItemSchema).min(1, "At least one item is required"),
  discount: z.number().min(0),
  paidAmount: z.number().min(0),
});

type BillForm = z.infer<typeof billSchema>;

export default function Billing() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<BillForm>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      items: [{ productName: '', quantity: 1, rate: 0, wholesaleRate: undefined }],
      discount: 0,
      paidAmount: 0
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchItems = useWatch({ control, name: 'items' }) ?? [];
  const watchDiscount = useWatch({ control, name: 'discount' }) ?? 0;
  const watchPaid = useWatch({ control, name: 'paidAmount' }) ?? 0;

  const totalAmount = watchItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.rate || 0)), 0);
  const dueAmount = totalAmount - watchDiscount - watchPaid;

  const onSubmit = async (data: BillForm) => {
    setLoading(true);
    
    // Add total to items
    const payload = {
      ...data,
      totalAmount,
      items: data.items.map(item => ({
        ...item,
        total: item.quantity * item.rate
      }))
    };

    const res = await fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json() as { id: string };
      setSuccess(true);
      reset();
      router.push(`/invoice/${data.id}`);
    } else {
      alert("Failed to create bill.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="h-6 w-6 text-blue-600" />
          Create New Bill
        </h2>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 p-4 border border-green-200">
          <p className="text-sm font-medium text-green-800">Bill created successfully!</p>
        </div>
      )}

      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Customer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input {...register('customerName')} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-blue-500 focus:ring-blue-500" placeholder="John Doe" />
                {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input {...register('customerPhone')} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-blue-500 focus:ring-blue-500" placeholder="9876543210" />
                {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone.message}</p>}
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Products</h3>
              <button
                type="button"
                onClick={() => append({ productName: '', quantity: 1, rate: 0, wholesaleRate: undefined })}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add Item
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 px-2 hidden md:grid">
                <div className="col-span-4">Product Name</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Rate (₹)</div>
                <div className="col-span-2">Wholesale (₹)</div>
                <div className="col-span-1">Total</div>
                <div className="col-span-1"></div>
              </div>

              {fields.map((field, index) => {
                const qty = watchItems[index]?.quantity || 0;
                const rate = watchItems[index]?.rate || 0;
                const total = qty * rate;

                return (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-gray-50 p-3 rounded-lg md:bg-transparent md:p-0 md:rounded-none">
                    <div className="col-span-1 md:col-span-4">
                      <label className="block text-xs text-gray-500 md:hidden mb-1">Product Name</label>
                      <input {...register(`items.${index}.productName`)} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-blue-500 focus:ring-blue-500" placeholder="E.g. Cotton Shirt" />
                      {errors.items?.[index]?.productName && <p className="text-red-500 text-xs mt-1">{errors.items[index]?.productName?.message}</p>}
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs text-gray-500 md:hidden mb-1">Quantity</label>
                      <input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-blue-500 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs text-gray-500 md:hidden mb-1">Rate (₹)</label>
                      <input type="number" {...register(`items.${index}.rate`, { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-blue-500 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs text-gray-500 md:hidden mb-1">Wholesale (₹)</label>
                      <input type="number" {...register(`items.${index}.wholesaleRate`, { valueAsNumber: true })} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-blue-500 focus:ring-blue-500" placeholder="Optional" />
                    </div>
                    <div className="col-span-1 md:col-span-1 pt-2 md:pt-0 font-medium text-gray-900">
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

          {/* Calculation */}
          <div className="border-t pt-6">
            <div className="w-full md:w-1/2 ml-auto space-y-4">
              <div className="flex justify-between items-center text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">₹{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Discount (₹)</span>
                <input type="number" {...register('discount', { valueAsNumber: true })} className="w-32 rounded-lg border-gray-300 border px-3 py-1 text-right focus:border-blue-500 focus:ring-blue-500" />
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Paid Amount (₹)</span>
                <input type="number" {...register('paidAmount', { valueAsNumber: true })} className="w-32 rounded-lg border-gray-300 border px-3 py-1 text-right focus:border-blue-500 focus:ring-blue-500" />
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
              className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Generate Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
