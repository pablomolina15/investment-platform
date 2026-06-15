import { NextResponse } from 'next/server';

function pythonUrl(): string | null {
  const url = process.env.PYTHON_SERVICE_URL;
  if (!url || url.trim() === '') return null;
  return url.trim().replace(/\/+$/, '');
}

export async function GET() {
  const base = pythonUrl();
  let pythonStatus = 'not configured';
  let pythonLatency = null;

  if (base) {
    try {
      const t0 = Date.now();
      const res = await fetch(`${base}/health`, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: 'application/json' },
      });
      pythonLatency = Date.now() - t0;
      pythonStatus = res.ok ? 'ok' : `error ${res.status}`;
    } catch (e) {
      pythonStatus = `unreachable: ${e instanceof Error ? e.message : 'unknown'}`;
    }
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    python_service: {
      url: base ?? 'not configured',
      status: pythonStatus,
      latency_ms: pythonLatency,
    },
    supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'not configured',
    version: '1.0.0',
  });
}
