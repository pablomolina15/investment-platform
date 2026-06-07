import { NextRequest, NextResponse } from 'next/server';
import { processOHLCV } from '@/lib/indicators';
import { generateDemoPrices, generateDemoFundamentals } from '@/lib/demo-data';
import { calculateValueScore } from '@/lib/value-scoring';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get('tickers') ?? 'AAPL,MSFT';
  const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).slice(0, 4);

  const results = await Promise.all(tickers.map(async (ticker) => {
    // Try Yahoo Finance
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1y&interval=1d`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const json = await res.json();
        const result = json?.chart?.result?.[0];
        if (result) {
          const timestamps: number[] = result.timestamp ?? [];
          const q = result.indicators?.quote?.[0] ?? {};
          const raw = timestamps.map((ts: number, i: number) => ({
            date: new Date(ts * 1000).toISOString().split('T')[0],
            open: Math.round((q.open?.[i] ?? 0) * 100) / 100,
            high: Math.round((q.high?.[i] ?? 0) * 100) / 100,
            low: Math.round((q.low?.[i] ?? 0) * 100) / 100,
            close: Math.round((q.close?.[i] ?? 0) * 100) / 100,
            volume: q.volume?.[i] ?? 0,
          })).filter(d => d.close > 0);
          const processed = processOHLCV(raw);
          const meta = result.meta ?? {};
          return {
            ticker,
            data: processed,
            currentPrice: meta.regularMarketPrice ?? processed[processed.length - 1]?.close,
            source: 'live' as const,
          };
        }
      }
    } catch { /* fallthrough */ }

    // Demo fallback
    const raw = generateDemoPrices(ticker, 365);
    return {
      ticker,
      data: processOHLCV(raw),
      currentPrice: raw[raw.length - 1].close,
      source: 'demo' as const,
    };
  }));

  // Normalize to % return from start for comparison
  const normalized = results.map(r => {
    const firstClose = r.data[0]?.close ?? 1;
    return {
      ...r,
      normalized: r.data.map(d => ({
        date: d.date,
        return: d.close ? Math.round(((d.close / firstClose) - 1) * 10000) / 100 : 0,
      })),
    };
  });

  // Also fetch fundamentals for comparison table
  const fundamentals = await Promise.all(tickers.map(async (ticker) => {
    try {
      const res = await fetch(
        `${process.env.PYTHON_SERVICE_URL}/analyze/fundamental/${ticker}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) return { ticker, ...(await res.json()) };
    } catch { /* fallthrough */ }

    const metrics = generateDemoFundamentals(ticker);
    const value_score = calculateValueScore(metrics);
    return { ticker, metrics, value_score, source: 'demo' };
  }));

  return NextResponse.json({ comparisons: normalized, fundamentals });
}
