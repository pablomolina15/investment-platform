import { NextRequest, NextResponse } from 'next/server';
import { processOHLCV } from '@/lib/indicators';
import { generateDemoPrices, generateDemoFundamentals } from '@/lib/demo-data';
import { calculateValueScore } from '@/lib/value-scoring';

function pythonUrl(): string | null {
  const url = process.env.PYTHON_SERVICE_URL;
  if (!url || url.trim() === '') return null;
  return url.trim().replace(/\/+$/, '');
}

async function fetchTickerPrices(ticker: string, base: string | null) {
  // Try Railway first
  if (base) {
    try {
      const res = await fetch(`${base}/analyze/technical/${ticker}?period=1y`, {
        signal: AbortSignal.timeout(30000),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const lastClose = data.data?.[data.data.length - 1]?.close;
        return { ticker, data: data.data, currentPrice: lastClose, source: 'live' as const };
      }
    } catch (e) {
      console.error(`[compare] Railway failed for ${ticker}:`, e);
    }
  }

  // Yahoo Finance direct
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1y&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const json   = await res.json();
      const result = json?.chart?.result?.[0];
      if (result) {
        const timestamps: number[] = result.timestamp ?? [];
        const q = result.indicators?.quote?.[0] ?? {};
        const raw = timestamps.map((ts: number, i: number) => ({
          date:   new Date(ts * 1000).toISOString().split('T')[0],
          open:   Math.round((q.open?.[i]   ?? 0) * 100) / 100,
          high:   Math.round((q.high?.[i]   ?? 0) * 100) / 100,
          low:    Math.round((q.low?.[i]    ?? 0) * 100) / 100,
          close:  Math.round((q.close?.[i]  ?? 0) * 100) / 100,
          volume: q.volume?.[i] ?? 0,
        })).filter(d => d.close > 0);
        const processed    = processOHLCV(raw);
        const currentPrice = result.meta?.regularMarketPrice ?? processed[processed.length - 1]?.close;
        return { ticker, data: processed, currentPrice, source: 'live' as const };
      }
    }
  } catch (e) {
    console.error(`[compare] Yahoo Finance failed for ${ticker}:`, e);
  }

  // Demo fallback
  const raw       = generateDemoPrices(ticker, 365);
  const processed = processOHLCV(raw);
  return { ticker, data: processed, currentPrice: raw[raw.length - 1].close, source: 'demo' as const };
}

async function fetchTickerFundamentals(ticker: string, base: string | null) {
  // Try Railway
  if (base) {
    try {
      const res = await fetch(`${base}/analyze/fundamental/${ticker}`, {
        signal: AbortSignal.timeout(30000),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) return { ticker, ...(await res.json()), source: 'live' };
    } catch (e) {
      console.error(`[compare] Railway fundamentals failed for ${ticker}:`, e);
    }
  }

  // Demo fallback
  const metrics     = generateDemoFundamentals(ticker);
  const value_score = calculateValueScore(metrics);
  return { ticker, metrics, value_score, source: 'demo' };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get('tickers') ?? 'AAPL,MSFT';
  const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).slice(0, 4);
  const base = pythonUrl();

  // Fetch prices + fundamentals for all tickers in parallel
  const [priceResults, fundResults] = await Promise.all([
    Promise.all(tickers.map(t => fetchTickerPrices(t, base))),
    Promise.all(tickers.map(t => fetchTickerFundamentals(t, base))),
  ]);

  // Normalize to % return from start for comparison chart
  const comparisons = priceResults.map(r => {
    const firstClose = r.data[0]?.close ?? 1;
    return {
      ticker: r.ticker,
      currentPrice: r.currentPrice,
      source: r.source,
      normalized: r.data.map((d: { date: string; close: number }) => ({
        date:   d.date,
        return: d.close ? Math.round(((d.close / firstClose) - 1) * 10000) / 100 : 0,
      })),
    };
  });

  return NextResponse.json({ comparisons, fundamentals: fundResults });
}
