// ─── Precios e Indicadores Técnicos ─────────────────────────────────────────

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalData extends OHLCV {
  sma50: number | null;
  sma200: number | null;
  ema50: number | null;
  ema200: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
}

export interface TechnicalSignals {
  golden_cross: boolean;
  death_cross: boolean;
  rsi_overbought: boolean;
  rsi_oversold: boolean;
  rsi_value: number | null;
  macd_bullish: boolean;
  macd_bearish: boolean;
  price_above_bb_upper: boolean;
  price_below_bb_lower: boolean;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface TechnicalResponse {
  ticker: string;
  period: string;
  data: TechnicalData[];
  signals: TechnicalSignals;
  last_updated: string;
  source: 'cache' | 'live' | 'demo';
}

// ─── Fundamentales ──────────────────────────────────────────────────────────

export interface FundamentalMetrics {
  // Valoración
  eps: number | null;
  pe_ratio: number | null;
  forward_pe: number | null;
  pb_ratio: number | null;
  ps_ratio: number | null;
  peg_ratio: number | null;

  // Rentabilidad
  profit_margin: number | null;
  operating_margin: number | null;
  roe: number | null;
  roa: number | null;

  // Dividendos
  dividend_yield: number | null;
  payout_ratio: number | null;

  // Deuda
  debt_to_equity: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;

  // Crecimiento
  revenue_growth_yoy: number | null;
  earnings_growth: number | null;

  // Precio
  current_price: number | null;
  week52_high: number | null;
  week52_low: number | null;
  market_cap: number | null;
}

export interface ValueCriterion {
  name: string;
  description: string;
  passed: boolean;
  points_earned: number;
  points_max: number;
  detail: string;
}

export interface ValueScore {
  score: number;
  rating: 'EXCELENTE' | 'BUENA' | 'MODERADA' | 'DÉBIL';
  color: 'green' | 'blue' | 'yellow' | 'red';
  criteria: ValueCriterion[];
  summary: string;
}

export interface FundamentalResponse {
  ticker: string;
  company_name: string;
  sector: string;
  industry: string;
  metrics: FundamentalMetrics;
  value_score: ValueScore;
  last_updated: string;
  source: 'cache' | 'live' | 'demo';
}

// ─── UI / Estado ─────────────────────────────────────────────────────────────

export type Period = '3mo' | '6mo' | '1y' | '2y' | '5y';

export interface SearchResult {
  ticker: string;
  name: string;
}

export const POPULAR_TICKERS: SearchResult[] = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corp.' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.' },
  { ticker: 'META', name: 'Meta Platforms' },
  { ticker: 'TSLA', name: 'Tesla Inc.' },
  { ticker: 'BRK-B', name: 'Berkshire Hathaway' },
  { ticker: 'JPM', name: 'JPMorgan Chase' },
  { ticker: 'V', name: 'Visa Inc.' },
];
