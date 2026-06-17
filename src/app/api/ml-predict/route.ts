import { NextRequest, NextResponse } from 'next/server';
import { generateDemoPrices } from '@/lib/demo-data';

function pythonUrl(): string | null {
  let url = process.env.PYTHON_SERVICE_URL;
  if (!url || url.trim() === '') return null;
  url = url.trim().replace(/\/+$/, '');
  // Add protocol if missing (common Vercel env var mistake)
  if (!/^https?:\/\//.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ticker = 'AAPL', model = 'random-forest', days_ahead = 5 } = body;

  if (!ticker || days_ahead < 1 || days_ahead > 30) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 422 });
  }

  // Try Python microservice (Railway) — ML needs it, no direct fallback
  const base = pythonUrl();
  if (base) {
    try {
      const res = await fetch(`${base}/predict/${model}/${ticker.toUpperCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ days_ahead }),
        signal: AbortSignal.timeout(120000), // 2 min — RF training takes ~10-30s
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ ...data, source: 'live' });
      }
      const errText = await res.text().catch(() => '');
      console.error(`[ml-predict] Railway ${res.status} for ${ticker}/${model}: ${errText.slice(0, 200)}`);
    } catch (e) {
      console.error(`[ml-predict] Railway fetch failed for ${ticker}/${model}:`, e);
    }
  } else {
    console.warn('[ml-predict] PYTHON_SERVICE_URL not set — using demo');
  }

  // Demo fallback
  return NextResponse.json(generateDemoMLPrediction(ticker, model, days_ahead));
}

// ── Demo generator (only used when Railway is down) ───────────────────────────
function generateDemoMLPrediction(ticker: string, model: string, daysAhead: number) {
  const prices    = generateDemoPrices(ticker, 30);
  const lastPrice = prices[prices.length - 1].close;
  const seed      = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng       = mulberry32(seed + daysAhead);
  const trendBias = (rng() - 0.48) * 0.02;

  const predictions = [];
  const now = new Date();
  let currentPrice = lastPrice;
  let businessDay = 0; let dayOffset = 0;

  while (businessDay < daysAhead) {
    dayOffset++;
    const d = new Date(now);
    d.setDate(now.getDate() + dayOffset);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    businessDay++;
    const dailyReturn = trendBias + (rng() - 0.5) * 0.015;
    currentPrice = currentPrice * (1 + dailyReturn);
    const uncertainty = lastPrice * 0.008 * Math.sqrt(businessDay);
    predictions.push({
      date:            d.toISOString().split('T')[0],
      predicted_price: round(currentPrice),
      lower_bound:     round(currentPrice - 1.96 * uncertainty),
      upper_bound:     round(currentPrice + 1.96 * uncertainty),
      confidence:      round(Math.max(0.3, 0.92 - businessDay * 0.04)),
    });
  }

  const features = ['RSI_14','SMA_50','MACD_12_26_9','return_5d','BBU_20_2.0','dist_sma50','volume_ratio','volatility_20d'];
  const weights  = features.map(() => rng());
  const total    = weights.reduce((a, b) => a + b, 0);

  return {
    ticker: ticker.toUpperCase(), model, days_ahead: daysAhead, predictions,
    feature_importance: Object.fromEntries(features.map((f, i) => [f, round(weights[i] / total)])),
    accuracy_metrics: {
      mape:          round(rng() * 3 + 1.5),
      rmse_return:   round(rng() * 1.5 + 0.8),
      test_samples:  Math.floor(rng() * 50 + 100),
      train_samples: Math.floor(rng() * 300 + 500),
    },
    last_updated: new Date().toISOString(),
    disclaimer: 'Predicción experimental (modo demo). No constituye consejo de inversión.',
    source: 'demo',
  };
}

function round(n: number, d = 4) { return Math.round(n * 10 ** d) / 10 ** d; }
function mulberry32(a: number) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
