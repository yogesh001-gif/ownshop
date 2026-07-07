import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const maxDuration = 60;

const jsonSchema = {
  type: "object",
  properties: {
    supplierName: { type: "string", description: "Name of the supplier or business on the invoice." },
    invoiceNumber: { type: "string", description: "Invoice number or bill number." },
    invoiceDate: { type: "string", description: "Date of the invoice in YYYY-MM-DD format if possible." },
    totalAmount: { type: "number", description: "Total bill amount." },
    paidAmount: { type: "number", description: "Amount paid, usually 0 if not specified." },
    dueAmount: { type: "number", description: "Amount due." },
    confidenceScores: {
      type: "object",
      description: "Estimate your confidence (0-100) for each field extracted based on how clearly you could read the text. Give a lower score if the image is blurry, handwriting is bad, or the field was inferred rather than explicitly stated.",
      properties: {
        supplierName: { type: "number" },
        invoiceNumber: { type: "number" },
        totalAmount: { type: "number" }
      },
      required: ["supplierName", "invoiceNumber", "totalAmount"]
    }
  },
  required: ["supplierName", "invoiceNumber", "totalAmount", "confidenceScores"]
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'image/jpeg';

    // 1. Upload to Cloudinary using a Promise
    const uploadToCloudinary = () => {
      return new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'ownshop/invoices' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });
    };

    const cloudinaryResult = await uploadToCloudinary();
    const invoiceImageUrl = cloudinaryResult.secure_url;

    // 2. OCR using Gemini
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: buffer.toString("base64"),
                mimeType,
              }
            },
            {
              text: "You are a smart invoice parser. Extract the details from this invoice and return it strictly in the JSON format specified by the schema. Ensure numbers are numbers, not strings."
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema,
      }
    });

    const text = response.text;
    if (!text) {
       throw new Error("Empty response from AI");
    }

    let resultData = JSON.parse(text);
    resultData.invoiceImageUrl = invoiceImageUrl; // Inject Cloudinary URL

    return NextResponse.json(resultData);
    
  } catch (error: any) {
    console.error("OCR Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to process image' }, { status: 500 });
  }
}
