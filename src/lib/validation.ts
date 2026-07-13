import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid record id');
const money = z.coerce.number().finite().nonnegative();
const positiveMoney = z.coerce.number().finite().positive();
const name = z.string().trim().min(1).max(120);
const phone = z.string().trim().min(3).max(30);

export const recordIdSchema = objectId;

export const contactSchema = z.object({
  name,
  phone,
  address: z.string().trim().max(500).optional().nullable(),
});

export const billItemSchema = z.object({
  productName: name,
  quantity: z.coerce.number().int().positive().max(1_000_000),
  rate: money,
  wholesaleRate: money.optional(),
});

export const createBillSchema = z.object({
  customerId: objectId.optional(),
  customerName: name.optional(),
  customerPhone: phone.optional(),
  items: z.array(billItemSchema).min(1).max(200),
  discount: money.optional().default(0),
  paidAmount: money.optional().default(0),
}).superRefine((data, ctx) => {
  if (!data.customerId && (!data.customerName || !data.customerPhone)) {
    ctx.addIssue({ code: 'custom', message: 'Customer details are required', path: ['customerName'] });
  }
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  if (data.discount > subtotal) {
    ctx.addIssue({ code: 'custom', message: 'Discount cannot exceed the subtotal', path: ['discount'] });
  }
  if (data.paidAmount > subtotal - data.discount) {
    ctx.addIssue({ code: 'custom', message: 'Paid amount cannot exceed the amount due', path: ['paidAmount'] });
  }
});

export const purchaseItemSchema = z.object({
  productName: name,
  quantity: z.coerce.number().int().positive().max(1_000_000),
  rate: money,
});

export const createPurchaseSchema = z.object({
  supplierId: objectId,
  items: z.array(purchaseItemSchema).min(1).max(200),
  paidAmount: money.optional().default(0),
  date: z.coerce.date().optional(),
}).superRefine((data, ctx) => {
  const total = data.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  if (data.paidAmount > total) {
    ctx.addIssue({ code: 'custom', message: 'Paid amount cannot exceed the purchase total', path: ['paidAmount'] });
  }
});

export const confirmPurchaseSchema = z.object({
  supplierName: name,
  supplierPhone: phone.optional(),
  invoiceNumber: z.string().trim().max(100).optional().nullable(),
  invoiceDate: z.coerce.date().optional(),
  invoiceImageUrl: z.string().url().max(2_000).optional().nullable(),
  totalAmount: money,
  paidAmount: money.optional().default(0),
}).superRefine((data, ctx) => {
  if (data.paidAmount > data.totalAmount) {
    ctx.addIssue({ code: 'custom', message: 'Paid amount cannot exceed the purchase total', path: ['paidAmount'] });
  }
});

export const customerPaymentSchema = z.object({
  customerId: objectId,
  billId: objectId,
  amount: positiveMoney,
});

export const supplierPaymentSchema = z.object({
  supplierId: objectId,
  purchaseId: objectId,
  amount: positiveMoney,
});

export const purchaseUpdateSchema = z.object({
  totalAmount: money,
  paidAmount: money,
  date: z.coerce.date(),
}).superRefine((data, ctx) => {
  if (data.paidAmount > data.totalAmount) {
    ctx.addIssue({ code: 'custom', message: 'Paid amount cannot exceed the purchase total', path: ['paidAmount'] });
  }
});

export function validationError(error: z.ZodError) {
  return error.issues.map(({ path, message }) => ({ field: path.join('.'), message }));
}
