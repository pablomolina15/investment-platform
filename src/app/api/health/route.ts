import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    python_service: process.env.PYTHON_SERVICE_URL ?? 'not configured',
    supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'not configured',
    version: '1.0.0',
  });
}
