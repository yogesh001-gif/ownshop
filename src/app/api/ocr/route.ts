import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenAI } from '@google/genai';
import { UploadApiResponse } from 'cloudinary';
import { z } from 'zod';
import { apiErrorResponse } from '@/lib/api-error';
import { cloudinary, hasCloudinaryConfiguration, signedInvoiceUrl } from '@/lib/cloudinary';

export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const jsonSchema = {
  type: 'object',
  properties: {
    supplierName: { type: 'string', description: 'Name of the supplier or business on the invoice.' },
    invoiceNumber: { type: 'string', description: 'Invoice number or bill number.' },
    invoiceDate: { type: 'string', description: 'Date of the invoice in YYYY-MM-DD format if possible.' },
    totalAmount: { type: 'number', description: 'Total bill amount.' },
    paidAmount: { type: 'number', description: 'Amount paid, usually 0 if not specified.' },
    dueAmount: { type: 'number', description: 'Amount due.' },
    confidenceScores: {
      type: 'object',
      properties: {
        supplierName: { type: 'number' },
        invoiceNumber: { type: 'number' },
        totalAmount: { type: 'number' },
      },
      required: ['supplierName', 'invoiceNumber', 'totalAmount'],
    },
  },
  required: ['supplierName', 'invoiceNumber', 'totalAmount', 'confidenceScores'],
};

const extractedInvoiceSchema = z.object({
  supplierName: z.string().trim().min(1).max(120),
  invoiceNumber: z.string().trim().max(100).optional(),
  invoiceDate: z.string().trim().optional(),
  totalAmount: z.coerce.number().finite().nonnegative(),
  paidAmount: z.coerce.number().finite().nonnegative().optional().default(0),
  dueAmount: z.coerce.number().finite().optional(),
  confidenceScores: z.object({
    supplierName: z.coerce.number().min(0).max(100),
    invoiceNumber: z.coerce.number().min(0).max(100),
    totalAmount: z.coerce.number().min(0).max(100),
  }),
});

async function uploadInvoice(buffer: Buffer): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'ownshop/invoices',
        resource_type: 'image',
        type: 'authenticated',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        overwrite: false,
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) resolve(result);
        else reject(new Error('Upload did not return an asset'));
      },
    ).end(buffer);
  });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasCloudinaryConfiguration() || !process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Invoice scanning is not configured' }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    if (!allowedImageTypes.has(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, and WebP invoice images are supported' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Invoice image must be between 1 byte and 10 MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const response = await new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }).models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: buffer.toString('base64'), mimeType: file.type } },
          { text: 'You are a smart invoice parser. Extract the details from this invoice and return JSON that matches the provided schema. Ensure all numbers are JSON numbers.' },
        ],
      }],
      config: { responseMimeType: 'application/json', responseSchema: jsonSchema },
    });

    if (!response.text) throw new Error('The invoice scanner returned no data');
    const extracted = extractedInvoiceSchema.safeParse(JSON.parse(response.text));
    if (!extracted.success) {
      return NextResponse.json({ error: 'The invoice scanner returned invalid data' }, { status: 422 });
    }

    const upload = await uploadInvoice(buffer);
    return NextResponse.json({
      ...extracted.data,
      dueAmount: extracted.data.dueAmount ?? extracted.data.totalAmount - extracted.data.paidAmount,
      invoiceImageUrl: signedInvoiceUrl(upload.public_id, upload.version),
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to process invoice image');
  }
}
