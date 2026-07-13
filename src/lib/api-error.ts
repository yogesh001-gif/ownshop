import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export function apiErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
