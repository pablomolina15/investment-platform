// src/app/api/price-at-date/route.ts
// Returns the closing price of a ticker on a specific date (or nearest trading day)
// Used for ML backtesting: compare predicted price vs actual price at target date

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get('ticker') ?? '').toUpperCase();
  const date   = searchParams.get('date') ?? '';  // YYYY-MM-DD

  if (!ticker || !date) {
    return NextResponse.json({ error: 'ticker and date required' }, { status: 400 });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format (YYYY-MM-DD)' }, { status: 400 });
  }

  // Only allow dates in the past
  if (new Date(date) >= new Date()) {
    return NextResponse.json({ error: 'Date must be in the past' }, { status: 400 });
  }

  try {
    // Fetch ±5 days around the target date to handle weekends and holidays
    const targetDate = new Date(date);
    const startDate  = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 5);

    const start = startDate.toISOString().split('T')[0];
    const end   = endDate.toISOString().split('T')[0];

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${Math.floor(startDate.getTime()/1000)}&period2=${Math.floor(endDate.getTime()/1000)}&interval=1d`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Yahoo Finance error ${res.status}` }, { status: 502 });
    }

    const json   = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      return NextResponse.json({ error: 'No data from Yahoo Finance' }, { status: 404 });
    }

    const timestamps: number[] = result.timestamp ?? [];
    const closes: number[]     = result.indicators?.quote?.[0]?.close ?? [];

    if (timestamps.length === 0) {
      return NextResponse.json({ error: 'No trading data for this period' }, { status: 404 });
    }

    // Find the closest date to the target
    const targetTs = targetDate.getTime();
    let bestIdx    = 0;
    let bestDiff   = Infinity;

    timestamps.forEach((ts, i) => {
      const diff = Math.abs(ts * 1000 - targetTs);
      if (diff < bestDiff && closes[i] != null && closes[i] > 0) {
        bestDiff = diff;
        bestIdx  = i;
      }
    });

    const actualDate  = new Date(timestamps[bestIdx] * 1000).toISOString().split('T')[0];
    const actualPrice = Math.round(closes[bestIdx] * 100) / 100;

    return NextResponse.json({
      ticker,
      requested_date: date,
      actual_date:    actualDate,   // nearest trading day
      price:          actualPrice,
      days_off:       Math.round(bestDiff / (1000 * 60 * 60 * 24)),
    }, {
      headers: { 'Cache-Control': 's-maxage=3600' }, // cache 1h (historical data doesn't change)
    });

  } catch (e) {
    console.error('[price-at-date]', e);
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
  }
}
