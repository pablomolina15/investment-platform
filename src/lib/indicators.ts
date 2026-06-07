import type { OHLCV, TechnicalData, TechnicalSignals } from '@/types/finance';

// ─── SMA ────────────────────────────────────────────────────────────────────
export function calculateSMA(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

// ─── EMA ────────────────────────────────────────────────────────────────────
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const ema: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return ema;

  const firstSMA = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema[period - 1] = firstSMA;

  for (let i = period; i < data.length; i++) {
    ema[i] = data[i] * k + (ema[i - 1] as number) * (1 - k);
  }
  return ema;
}

// ─── RSI ────────────────────────────────────────────────────────────────────
export function calculateRSI(closes: number[], period = 14): (number | null)[] {
  const rsi: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return rsi;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

// ─── MACD ───────────────────────────────────────────────────────────────────
export function calculateMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { macdLine: (number | null)[]; signalLine: (number | null)[]; histogram: (number | null)[] } {
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);

  const macdLine: (number | null)[] = emaFast.map((f, i) =>
    f !== null && emaSlow[i] !== null ? f - (emaSlow[i] as number) : null
  );

  const validMacd = macdLine.filter((v): v is number => v !== null);
  const signalRaw = calculateEMA(validMacd, signal);

  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  let sigIdx = 0;
  macdLine.forEach((v, i) => {
    if (v !== null) {
      signalLine[i] = signalRaw[sigIdx] ?? null;
      sigIdx++;
    }
  });

  const histogram = macdLine.map((m, i) =>
    m !== null && signalLine[i] !== null ? m - (signalLine[i] as number) : null
  );

  return { macdLine, signalLine, histogram };
}

// ─── Bollinger Bands ─────────────────────────────────────────────────────────
export function calculateBollingerBands(
  closes: number[],
  period = 20,
  stdDev = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  closes.forEach((_, i) => {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
      return;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i] as number;
    const variance = slice.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    upper.push(mean + stdDev * std);
    lower.push(mean - stdDev * std);
  });

  return { upper, middle, lower };
}

// ─── Procesar datos raw → TechnicalData completo ────────────────────────────
export function processOHLCV(raw: OHLCV[]): TechnicalData[] {
  const closes = raw.map(d => d.close);

  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);
  const { macdLine, signalLine, histogram } = calculateMACD(closes);
  const bb = calculateBollingerBands(closes, 20, 2);

  return raw.map((candle, i) => ({
    ...candle,
    sma50: sma50[i],
    sma200: sma200[i],
    ema50: ema50[i],
    ema200: ema200[i],
    rsi: rsi[i],
    macd: macdLine[i],
    macdSignal: signalLine[i],
    macdHistogram: histogram[i],
    bbUpper: bb.upper[i],
    bbMiddle: bb.middle[i],
    bbLower: bb.lower[i],
  }));
}

// ─── Detectar señales ────────────────────────────────────────────────────────
export function detectSignals(data: TechnicalData[]): TechnicalSignals {
  const signals: TechnicalSignals = {
    golden_cross: false,
    death_cross: false,
    rsi_overbought: false,
    rsi_oversold: false,
    rsi_value: null,
    macd_bullish: false,
    macd_bearish: false,
    price_above_bb_upper: false,
    price_below_bb_lower: false,
    trend: 'neutral',
  };

  if (data.length < 2) return signals;

  const last = data[data.length - 1];
  const prev = data[data.length - 2];

  // Golden / Death Cross
  if (last.sma50 !== null && last.sma200 !== null && prev.sma50 !== null && prev.sma200 !== null) {
    if (prev.sma50 < prev.sma200 && last.sma50 > last.sma200) {
      signals.golden_cross = true;
      signals.trend = 'bullish';
    } else if (prev.sma50 > prev.sma200 && last.sma50 < last.sma200) {
      signals.death_cross = true;
      signals.trend = 'bearish';
    } else {
      signals.trend = last.sma50 > last.sma200 ? 'bullish' : 'bearish';
    }
  }

  // RSI
  if (last.rsi !== null) {
    signals.rsi_value = Math.round(last.rsi * 100) / 100;
    signals.rsi_overbought = last.rsi > 70;
    signals.rsi_oversold = last.rsi < 30;
  }

  // MACD
  if (last.macd !== null && last.macdSignal !== null && prev.macd !== null && prev.macdSignal !== null) {
    if (prev.macd < prev.macdSignal && last.macd > last.macdSignal) signals.macd_bullish = true;
    if (prev.macd > prev.macdSignal && last.macd < last.macdSignal) signals.macd_bearish = true;
  }

  // Bollinger
  if (last.bbUpper !== null) signals.price_above_bb_upper = last.close > last.bbUpper;
  if (last.bbLower !== null) signals.price_below_bb_lower = last.close < last.bbLower;

  return signals;
}

// ─── Formatear números ───────────────────────────────────────────────────────
export function formatPrice(value: number | null | undefined, decimals = 2): string {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatLargeNumber(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  return value.toLocaleString('es-ES');
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value == null) return 'N/A';
  const v = Math.abs(value) < 1 ? value * 100 : value;
  return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`;
}
