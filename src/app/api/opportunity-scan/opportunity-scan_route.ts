// src/app/api/opportunity-scan/route.ts
import { NextRequest, NextResponse } from 'next/server';

function pythonUrl(): string | null {
  let url = process.env.PYTHON_SERVICE_URL;
  if (!url || url.trim() === '') return null;
  url = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  return url;
}

export const maxDuration = 120; // Vercel: allow up to 2 min for the scan

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const maxResults = Math.min(25, Math.max(1, Number(searchParams.get('max') ?? '10')));

  const base = pythonUrl();
  if (!base) {
    return NextResponse.json(
      { error: 'Python service not configured', opportunities: [] },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(
      `${base}/scan/opportunities?max_results=${maxResults}`,
      {
        signal: AbortSignal.timeout(115_000), // just under Vercel's limit
        headers: { Accept: 'application/json' },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[opportunity-scan] Railway ${res.status}: ${text.slice(0, 200)}`);
      return NextResponse.json(
        { error: `Scanner error ${res.status}`, opportunities: [] },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Add cache headers — tell browser/CDN to cache 10 min
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=300' },
    });
  } catch (e) {
    console.error('[opportunity-scan] fetch failed:', e);
    return NextResponse.json(
      { error: 'Scanner unavailable', opportunities: [] },
      { status: 503 }
    );
  }
}
