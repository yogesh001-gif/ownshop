'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

type ConfidenceScores = { supplierName?: number; invoiceNumber?: number; totalAmount?: number };
type OcrData = {
  supplierName: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount?: number;
  confidenceScores: ConfidenceScores;
  invoiceImageUrl: string;
};

function ConfidenceWarning({ score }: { score?: number }) {
  if (score === undefined || score >= 80) return null;
  return (
    <div className="flex items-center gap-1 text-orange-600 text-xs mt-1 bg-orange-50 px-2 py-0.5 rounded w-fit">
      <AlertTriangle className="w-3 h-3" />
      Low confidence ({score}%) - Please verify
    </div>
  );
}

export default function ScanInvoice() {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'review' | 'success'>('idle');
  const [ocrData, setOcrData] = useState<OcrData | null>(null);
  const [saving, setSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setPreview(URL.createObjectURL(selected));
    setStatus('scanning');

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to scan invoice");
      
      const data = await res.json() as OcrData;
      setOcrData(data);
      setStatus('review');
    } catch {
      alert("Error scanning invoice. Please try again.");
      setStatus('idle');
    }
  };

  const handleUpdateField = <Field extends keyof OcrData>(field: Field, value: OcrData[Field]) => {
    setOcrData((previous) => previous ? { ...previous, [field]: value } : previous);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/purchases/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ocrData),
      });

      if (!res.ok) {
        throw new Error('Failed to save purchase');
      }
      
      setStatus('success');
      // Redirect after 2s
      setTimeout(() => {
        window.location.href = '/purchases';
      }, 2000);
    } catch (error) {
      alert(`Error saving: ${error instanceof Error ? error.message : 'Please try again.'}`);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Camera className="h-6 w-6 text-blue-600" />
          Smart Invoice Scanner
        </h2>
      </div>

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-white shadow-sm border border-gray-100 p-8 text-center"
          >
            <div className="mx-auto w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload or Scan Invoice</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Our AI will read the supplier, invoice reference, date, and payment totals for your review.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              >
                <Upload className="w-5 h-5" />
                Select Photo or PDF
              </button>
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.capture = 'environment';
                    fileInputRef.current.click();
                  }
                }}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors"
              >
                <Camera className="w-5 h-5" />
                Use Camera
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </motion.div>
        )}

        {status === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-white shadow-sm border border-gray-100 p-12 text-center"
          >
            <div className="relative mx-auto w-32 h-32 mb-6">
              {preview && <Image src={preview} alt="Scanning" fill unoptimized sizes="128px" className="object-cover rounded-xl opacity-50" />}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">AI is reading your invoice...</h3>
            <p className="text-gray-500 mt-2">This usually takes 5-10 seconds.</p>
          </motion.div>
        )}

        {status === 'review' && ocrData && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-900">Please review the details below</h4>
                <p className="text-sm text-orange-700 mt-1">
                  AI has extracted the information. Check everything before confirming. A supplier will be created only when no matching supplier exists.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Supplier Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                  <input
                    value={ocrData.supplierName || ''}
                    onChange={(e) => handleUpdateField('supplierName', e.target.value)}
                    className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-blue-600 outline-none transition-shadow"
                  />
                  <ConfidenceWarning score={ocrData.confidenceScores?.supplierName} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                    <input
                      value={ocrData.invoiceNumber || ''}
                      onChange={(e) => handleUpdateField('invoiceNumber', e.target.value)}
                      className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                    <ConfidenceWarning score={ocrData.confidenceScores?.invoiceNumber} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={ocrData.invoiceDate || ''}
                      onChange={(e) => handleUpdateField('invoiceDate', e.target.value)}
                      className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Payment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                    <input
                      type="number"
                      value={ocrData.totalAmount || 0}
                      onChange={(e) => handleUpdateField('totalAmount', parseFloat(e.target.value))}
                      className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                    <ConfidenceWarning score={ocrData.confidenceScores?.totalAmount} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount (₹)</label>
                    <input
                      type="number"
                      value={ocrData.paidAmount || 0}
                      onChange={(e) => handleUpdateField('paidAmount', parseFloat(e.target.value))}
                      className="w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Invoice Image Uploaded</h3>
                <p className="text-sm text-gray-500 mt-1">
                  The photo of this invoice will be attached to this purchase record. Products and wholesale rates are not extracted automatically, so add them through a regular purchase when inventory must be updated.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                onClick={() => { setStatus('idle'); setOcrData(null); }}
                className="px-6 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="px-8 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Confirm & Save
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-white shadow-sm border border-gray-100 p-12 text-center"
          >
            <div className="mx-auto w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Purchase Saved!</h3>
            <p className="text-gray-500">Supplier account has been updated and the invoice image is saved.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
