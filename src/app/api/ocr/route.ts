import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { auth } from '@clerk/nextjs/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const jsonSchema = {
  type: "object",
  properties: {
    supplierName: { type: "string", description: "Name of the supplier or business on the invoice." },
    invoiceNumber: { type: "string", description: "Invoice number or bill number." },
    invoiceDate: { type: "string", description: "Date of the invoice in YYYY-MM-DD format if possible." },
    totalAmount: { type: "number", description: "Total bill amount." },
    paidAmount: { type: "number", description: "Amount paid, usually 0 if not specified." },
    dueAmount: { type: "number", description: "Amount due." },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          productName: { type: "string", description: "Name of the product." },
          quantity: { type: "number", description: "Quantity purchased." },
          rate: { type: "number", description: "Unit price or rate." },
          total: { type: "number", description: "Total price for the item." },
        },
        required: ["productName", "quantity", "rate", "total"]
      }
    },
    confidenceScores: {
      type: "object",
      description: "Estimate your confidence (0-100) for each field extracted based on how clearly you could read the text. Give a lower score if the image is blurry, handwriting is bad, or the field was inferred rather than explicitly stated.",
      properties: {
        supplierName: { type: "number" },
        invoiceNumber: { type: "number" },
        totalAmount: { type: "number" },
        items: { type: "number" }
      },
      required: ["supplierName", "invoiceNumber", "totalAmount", "items"]
    }
  },
  required: ["supplierName", "invoiceNumber", "totalAmount", "items", "confidenceScores"]
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing from environment variables.' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    // Determine mime type
    const mimeType = file.type || 'image/jpeg';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Extract the following invoice details accurately. If a field is not clearly visible, try to infer it from context or leave it blank. Provide confidence scores based on legibility and certainty." },
            { inlineData: { data: base64Data, mimeType } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema,
      }
    });

    const outputText = response.text;
    
    if (!outputText) {
       throw new Error("No text returned from Gemini");
    }

    const parsedData = JSON.parse(outputText);
    return NextResponse.json(parsedData);
    
  } catch (error: any) {
    console.error("OCR Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to process invoice' }, { status: 500 });
  }
}
