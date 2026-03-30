import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function handleError(error: unknown) {
  console.error('API Error:', error);
  
  if (error instanceof ZodError) {
    return NextResponse.json(
      { detail: 'Validation error', errors: error.errors },
      { status: 422 }
    );
  }
  
  return NextResponse.json(
    { detail: 'AI service unavailable, please retry' },
    { status: 503 }
  );
}

export function successResponse(data: any) {
  return NextResponse.json(data);
}
