// src/app/api/prices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processOHLCV, detectSignals } from '@/lib/indicators';
import { generateDemoPrices } from '@/lib/demo-data';
import { getCachedPrices, setCachedPrices } from '@/lib/supabase';
import type { OHLCV, TechnicalResponse } from '@/types/finance';

// ✅ FIX: Added '5d' and '1mo' that the technical page sends for short periods
const VALID_PERIODS = ['5d', '1mo', '3mo', '6mo', '1y', '2y', '5y'];

function pythonUrl(): string | null {
  let url = process.env.PYTHON_SERVICE_URL;
  if (!url || url.trim() === '') return null;
  url = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get('ticker') ?? 'AAPL').toUpperCase();
  const period  = searchParams.get('period') ?? '1y';

  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  }

  // 1. Supabase cache
  try {
    const cached = await getCachedPrices(ticker, period);
    if (cached) return NextResponse.json({ ...cached, source: 'cache' });
  } catch { /* cache miss — continue */ }

  // 2. Python microservice (Railway)
  const base = pythonUrl();
  if (base) {
    try {
      const res = await fetch(`${base}/analyze/technical/${ticker}?period=${period}`, {
        signal: AbortSignal.timeout(30000),
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const pyData = await res.json();
        const response = { ...pyData, source: 'live' };
        try { await setCachedPrices(ticker, period, pyData); } catch { /* ok */ }
        return NextResponse.json(response);
      }
      console.error(`[prices] Railway returned ${res.status} for ${ticker}`);
    } catch (e) {
      console.error(`[prices] Railway fetch failed for ${ticker}:`, e);
    }
  } else {
    console.warn('[prices] PYTHON_SERVICE_URL not set — skipping Railway');
  }

  // 3. Yahoo Finance direct (fallback)
  try {
    const yahooData = await fetchYahooFinance(ticker, period);
    if (yahooData.length > 5) {
      const processed = processOHLCV(yahooData);
      const signals   = detectSignals(processed);
      const response: Omit<TechnicalResponse, 'source'> = {
        ticker, period, data: processed, signals,
        last_updated: new Date().toISOString(),
      };
      try { await setCachedPrices(ticker, period, response); } catch { /* ok */ }
      return NextResponse.json({ ...response, source: 'live' });
    }
  } catch (e) {
    console.error(`[prices] Yahoo Finance failed for ${ticker}:`, e);
  }

  // 4. Demo — last resort
  console.warn(`[prices] Falling back to demo data for ${ticker}`);
  const daysMap: Record<string, number> = {
    '5d': 7, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '2y': 730, '5y': 1825,
  };
  const raw       = generateDemoPrices(ticker, daysMap[period] ?? 365);
  const processed = processOHLCV(raw);
  const signals   = detectSignals(processed);
  return NextResponse.json({
    ticker, period, data: processed, signals,
    last_updated: new Date().toISOString(),
    source: 'demo',
  });
}

async function fetchYahooFinance(ticker: string, period: string): Promise<OHLCV[]> {
  // ✅ FIX: Added intervals for the new short periods
  const intervalMap: Record<string, string> = {
    '5d':  '30m',  // intraday for 5-day view
    '1mo': '1d',
    '3mo': '1d',
    '6mo': '1d',
    '1y':  '1d',
    '2y':  '1wk',
    '5y':  '1wk',
  };
  const interval = intervalMap[period] ?? '1d';

  // Yahoo uses different range param for intraday
  const rangeMap: Record<string, string> = {
    '5d': '5d', '1mo': '1mo', '3mo': '3mo',
    '6mo': '6mo', '1y': '1y', '2y': '2y', '5y': '5y',
  };
  const range = rangeMap[period] ?? period;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}&includePrePost=false`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);

  const json   = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('No Yahoo result');

  const timestamps: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};

  return timestamps.map((ts, i) => ({
    date:   new Date(ts * 1000).toISOString().split('T')[0],
    open:   Math.round((q.open?.[i]   ?? 0) * 100) / 100,
    high:   Math.round((q.high?.[i]   ?? 0) * 100) / 100,
    low:    Math.round((q.low?.[i]    ?? 0) * 100) / 100,
    close:  Math.round((q.close?.[i]  ?? 0) * 100) / 100,
    volume: q.volume?.[i] ?? 0,
  })).filter(d => d.close > 0 && !isNaN(d.close));
}