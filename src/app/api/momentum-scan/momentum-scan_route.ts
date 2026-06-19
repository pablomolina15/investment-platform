// src/app/api/momentum-scan/route.ts
import { NextResponse } from 'next/server';
import { processOHLCV, detectSignals } from '@/lib/indicators';
import type { OHLCV, TechnicalData } from '@/types/finance';

function pythonUrl(): string | null {
  let url = process.env.PYTHON_SERVICE_URL;
  if (!url || url.trim() === '') return null;
  url = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  return url;
}

// Universo de acciones líquidas y volátiles — buenas candidatas para swing trading corto plazo
const SCAN_UNIVERSE = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  'AMD', 'NFLX', 'CRM', 'AVGO', 'COIN', 'PLTR', 'SHOP', 'UBER',
];

// ✅ Minimum score to be shown as an "opportunity". Below this threshold,
// the stock shows no real bullish conviction and would only mislead users.
const MIN_SCORE_THRESHOLD = 45;

// Maximum candidates to display
const MAX_CANDIDATES = 6;

interface MomentumCandidate {
  ticker: string;
  currentPrice: number;
  changePct5d: number;
  rsi: number;
  trend: string;
  goldenCross: boolean;
  macdBullish: boolean;
  aboveSma50: boolean;
  pctFromBbUpper: number;
  momentumScore: number;
  signals: string[];
}

async function fetchTechnical(ticker: string, base: string | null): Promise<TechnicalData[] | null> {
  // Try Railway
  if (base) {
    try {
      const res = await fetch(`${base}/analyze/technical/${ticker}?period=3mo`, {
        signal: AbortSignal.timeout(20000),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        return data.data as TechnicalData[];
      }
    } catch { /* fall through */ }
  }

  // Yahoo Finance direct fallback
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=3mo&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const timestamps: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const raw: OHLCV[] = timestamps.map((ts, i) => ({
      date:   new Date(ts * 1000).toISOString().split('T')[0],
      open:   Math.round((q.open?.[i]   ?? 0) * 100) / 100,
      high:   Math.round((q.high?.[i]   ?? 0) * 100) / 100,
      low:    Math.round((q.low?.[i]    ?? 0) * 100) / 100,
      close:  Math.round((q.close?.[i]  ?? 0) * 100) / 100,
      volume: q.volume?.[i] ?? 0,
    })).filter(d => d.close > 0);
    return processOHLCV(raw);
  } catch {
    return null;
  }
}

function scoreMomentum(data: TechnicalData[]): MomentumCandidate | null {
  if (data.length < 30) return null;

  const last = data[data.length - 1];
  const fiveDaysAgo = data[Math.max(0, data.length - 6)];
  const signals = detectSignals(data);

  if (last.close == null || last.rsi == null) return null;

  const changePct5d = fiveDaysAgo.close
    ? ((last.close - fiveDaysAgo.close) / fiveDaysAgo.close) * 100
    : 0;

  const aboveSma50 = last.sma50 != null && last.close > last.sma50;
  const pctFromBbUpper = last.bbUpper
    ? ((last.close - last.bbUpper) / last.bbUpper) * 100
    : -100;

  // ── Scoring heuristic for SHORT-TERM (< 15 días) continuation ──────────────
  let score = 0;
  const reasons: string[] = [];

  // Momentum 5 días (peso alto — es la señal más directa de corto plazo)
  if (changePct5d > 0) {
    score += Math.min(changePct5d * 3, 30);
    if (changePct5d > 3) reasons.push(`+${changePct5d.toFixed(1)}% últimos 5 días`);
  } else {
    // ✅ FIX: Penalize negative 5d momentum explicitly (was just not adding points before)
    score += Math.max(changePct5d * 2, -20);
  }

  // RSI en zona de fuerza saludable (55-70) — momentum sin sobrecompra extrema
  if (last.rsi >= 55 && last.rsi <= 70) {
    score += 20;
    reasons.push(`RSI ${last.rsi.toFixed(0)} (zona fuerte)`);
  } else if (last.rsi > 70 && last.rsi < 80) {
    score += 5; // sobrecomprado pero aún con inercia
  } else if (last.rsi > 80) {
    score -= 15; // sobrecompra extrema — riesgo de corrección
  } else if (last.rsi < 45) {
    // ✅ FIX: Penalize weak RSI more aggressively (was only penalising RSI<50 implicitly)
    score -= 15;
  } else if (last.rsi >= 45 && last.rsi < 55) {
    score += 0; // neutral zone — no points, no penalty
  }

  // Tendencia alcista confirmada (SMA50 > SMA200)
  if (signals.trend === 'bullish') {
    score += 15;
    reasons.push('Tendencia alcista confirmada');
  }

  // Golden cross reciente — señal fuerte de continuación
  if (signals.golden_cross) {
    score += 20;
    reasons.push('Golden Cross reciente');
  }

  // MACD cruzando al alza — momentum acelerando
  if (signals.macd_bullish) {
    score += 15;
    reasons.push('MACD cruce alcista');
  }

  // Precio sobre SMA50 — soporte de corto plazo
  if (aboveSma50) {
    score += 10;
  } else {
    // ✅ FIX: Below SMA50 is a negative signal, not neutral
    score -= 8;
  }

  // Cerca de banda superior de Bollinger sin excederla mucho — breakout potencial
  if (pctFromBbUpper > -3 && pctFromBbUpper < 2) {
    score += 10;
    reasons.push('Cerca de ruptura (Bollinger superior)');
  } else if (pctFromBbUpper > 5) {
    score -= 15; // muy extendido, riesgo de pullback
  } else if (pctFromBbUpper < -10) {
    // ✅ FIX: Price well below BB upper means weak momentum
    score -= 5;
  }

  // Penalizar tendencia bajista o death cross
  if (signals.trend === 'bearish') score -= 25;
  if (signals.death_cross) score -= 30;

  return {
    ticker: '', // filled by caller
    currentPrice: last.close,
    changePct5d: Math.round(changePct5d * 100) / 100,
    rsi: Math.round(last.rsi * 10) / 10,
    trend: signals.trend,
    goldenCross: signals.golden_cross,
    macdBullish: signals.macd_bullish,
    aboveSma50,
    pctFromBbUpper: Math.round(pctFromBbUpper * 100) / 100,
    momentumScore: Math.round(Math.max(0, Math.min(100, score))),
    signals: reasons,
  };
}

export async function GET() {
  const base = pythonUrl();

  const results = await Promise.all(
    SCAN_UNIVERSE.map(async (ticker) => {
      const data = await fetchTechnical(ticker, base);
      if (!data) return null;
      const scored = scoreMomentum(data);
      if (!scored) return null;
      return { ...scored, ticker };
    })
  );

  const allScored = results
    .filter((r): r is MomentumCandidate => r !== null)
    .sort((a, b) => b.momentumScore - a.momentumScore);

  // ✅ FIX: Only show candidates that pass the minimum quality threshold.
  // This prevents low-conviction stocks from appearing as "opportunities".
  const candidates = allScored
    .filter(c => c.momentumScore >= MIN_SCORE_THRESHOLD)
    .slice(0, MAX_CANDIDATES);

  return NextResponse.json({
    candidates,
    scanned_at: new Date().toISOString(),
    universe_size: SCAN_UNIVERSE.length,
    qualified: candidates.length,          // how many passed the threshold
    total_scanned: allScored.length,       // debug info
    min_score_threshold: MIN_SCORE_THRESHOLD,
    source: base ? 'live' : 'yahoo_direct',
    disclaimer: 'Análisis técnico automatizado basado en momentum e indicadores. No constituye recomendación de inversión.',
  });
}