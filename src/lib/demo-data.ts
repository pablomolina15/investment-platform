import type { OHLCV, FundamentalMetrics } from '@/types/finance';

// Genera precios OHLCV sintéticos realistas con paseo aleatorio
export function generateDemoPrices(ticker: string, days = 365): OHLCV[] {
  const seed = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = mulberry32(seed);

  const basePrice = 100 + (seed % 400);
  const data: OHLCV[] = [];
  let price = basePrice;

  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = (rng() - 0.48) * price * 0.025;
    const open = price;
    price = Math.max(1, price + change);
    const high = Math.max(open, price) * (1 + rng() * 0.01);
    const low = Math.min(open, price) * (1 - rng() * 0.01);
    const volume = Math.floor(1_000_000 + rng() * 50_000_000);

    data.push({
      date: date.toISOString().split('T')[0],
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(price),
      volume,
    });
  }
  return data;
}

export function generateDemoFundamentals(ticker: string): FundamentalMetrics {
  const seed = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = mulberry32(seed + 1);

  return {
    eps: round(rng() * 10 + 1),
    pe_ratio: round(rng() * 30 + 8),
    forward_pe: round(rng() * 25 + 6),
    pb_ratio: round(rng() * 5 + 0.5),
    ps_ratio: round(rng() * 8 + 0.5),
    peg_ratio: round(rng() * 3 + 0.5),
    profit_margin: round(rng() * 0.3 + 0.02),
    operating_margin: round(rng() * 0.35 + 0.05),
    roe: round(rng() * 0.4 + 0.05),
    roa: round(rng() * 0.2 + 0.02),
    dividend_yield: rng() > 0.4 ? round(rng() * 0.05) : null,
    payout_ratio: rng() > 0.4 ? round(rng() * 0.6) : null,
    debt_to_equity: round(rng() * 150 + 10),
    current_ratio: round(rng() * 3 + 0.8),
    quick_ratio: round(rng() * 2 + 0.5),
    revenue_growth_yoy: round((rng() - 0.2) * 40),
    earnings_growth: round((rng() - 0.2) * 50),
    current_price: round(100 + (seed % 400) + (rng() - 0.5) * 50),
    week52_high: round(100 + (seed % 400) + rng() * 80),
    week52_low: round(100 + (seed % 400) - rng() * 40),
    market_cap: Math.floor(rng() * 2e12 + 1e9),
  };
}

function round(n: number, d = 2) {
  return Math.round(n * 10 ** d) / 10 ** d;
}

function mulberry32(a: number) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
