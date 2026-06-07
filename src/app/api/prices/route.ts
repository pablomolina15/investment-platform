import { NextRequest, NextResponse } from 'next/server';
import { processOHLCV, detectSignals } from '@/lib/indicators';
import { generateDemoPrices } from '@/lib/demo-data';
import { getCachedPrices, setCachedPrices } from '@/lib/supabase';
import type { OHLCV, TechnicalResponse } from '@/types/finance';

const VALID_PERIODS = ['3mo', '6mo', '1y', '2y', '5y'];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get('ticker') ?? 'AAPL').toUpperCase();
  const period = searchParams.get('period') ?? '1y';

  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  }

  // 1. Check Supabase cache
  const cached = await getCachedPrices(ticker, period);
  if (cached) {
    return NextResponse.json({ ...cached, source: 'cache' });
  }

  // 2. Try Python microservice if configured
  const pythonUrl = process.env.PYTHON_SERVICE_URL;
  if (pythonUrl) {
    try {
      const res = await fetch(`${pythonUrl}/analyze/technical/${ticker}?period=${period}`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const pyData = await res.json();
        await setCachedPrices(ticker, period, pyData);
        return NextResponse.json({ ...pyData, source: 'live' });
      }
    } catch { /* fall through to demo */ }
  }

  // 3. Try Yahoo Finance directly via yfinance-compatible URL (unofficial)
  try {
    const yahooData = await fetchYahooFinance(ticker, period);
    if (yahooData && yahooData.length > 10) {
      const processed = processOHLCV(yahooData);
      const signals = detectSignals(processed);
      const response: Omit<TechnicalResponse, 'source'> = {
        ticker,
        period,
        data: processed,
        signals,
        last_updated: new Date().toISOString(),
      };
      await setCachedPrices(ticker, period, response);
      return NextResponse.json({ ...response, source: 'live' });
    }
  } catch { /* fall through to demo */ }

  // 4. Demo fallback — always works
  const daysMap: Record<string, number> = { '3mo': 90, '6mo': 180, '1y': 365, '2y': 730, '5y': 1825 };
  const rawDemo = generateDemoPrices(ticker, daysMap[period] ?? 365);
  const processed = processOHLCV(rawDemo);
  const signals = detectSignals(processed);

  const demoResponse: Omit<TechnicalResponse, 'source'> = {
    ticker,
    period,
    data: processed,
    signals,
    last_updated: new Date().toISOString(),
  };

  return NextResponse.json({ ...demoResponse, source: 'demo' });
}

// ─── Yahoo Finance Chart API (sin librería externa) ──────────────────────────
async function fetchYahooFinance(ticker: string, period: string): Promise<OHLCV[]> {
  const intervalMap: Record<string, string> = {
    '3mo': '1d', '6mo': '1d', '1y': '1d', '2y': '1wk', '5y': '1wk',
  };
  const interval = intervalMap[period] ?? '1d';

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${period}&interval=${interval}&includePrePost=false`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`Yahoo ${res.status}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('No result');

  const timestamps: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const opens: number[] = q.open ?? [];
  const highs: number[] = q.high ?? [];
  const lows: number[] = q.low ?? [];
  const closes: number[] = q.close ?? [];
  const volumes: number[] = q.volume ?? [];

  return timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: round(opens[i]),
      high: round(highs[i]),
      low: round(lows[i]),
      close: round(closes[i]),
      volume: volumes[i] ?? 0,
    }))
    .filter(d => d.close && !isNaN(d.close));
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
