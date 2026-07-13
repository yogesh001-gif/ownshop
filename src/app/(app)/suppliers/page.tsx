'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Truck, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const supplierSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone is required"),
  address: z.string().optional(),
});

type SupplierForm = z.infer<typeof supplierSchema>;
type SupplierSummary = { id: string; name: string; phone: string; address: string | null; createdAt: string };

function isSupplierSummary(value: unknown): value is SupplierSummary {
  return typeof value === 'object' && value !== null &&
    typeof (value as SupplierSummary).id === 'string' &&
    typeof (value as SupplierSummary).name === 'string' &&
    typeof (value as SupplierSummary).phone === 'string' &&
    typeof (value as SupplierSummary).createdAt === 'string';
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema)
  });

  const fetchSuppliers = async (searchQuery = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
      const data: unknown = await res.json();
      setSuppliers(Array.isArray(data) ? data.filter(isSupplierSummary) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSuppliers = async () => {
      await fetchSuppliers();
    };
    void loadSuppliers();
  }, []);

  const onSubmit = async (data: SupplierForm) => {
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      reset();
      setShowForm(false);
      fetchSuppliers(search);
    } else {
      alert("Failed to add supplier. Phone might already exist.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="h-6 w-6 text-purple-600" />
          Suppliers
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input {...register('name')} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-purple-500 focus:ring-purple-500" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input {...register('phone')} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-purple-500 focus:ring-purple-500" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea {...register('address')} className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:border-purple-500 focus:ring-purple-500" rows={2} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">Save Supplier</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchSuppliers(search)}
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <button onClick={() => fetchSuppliers(search)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 border border-gray-200">
            Search
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Address</th>
                <th className="px-6 py-4 font-medium">Created Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No suppliers found</td></tr>
              ) : (
                suppliers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-4">{c.phone}</td>
                    <td className="px-6 py-4 text-gray-500">{c.address || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/suppliers/${c.id}`} className="text-purple-600 hover:text-purple-900 font-medium text-sm">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
