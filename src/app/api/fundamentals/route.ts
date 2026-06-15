import { NextRequest, NextResponse } from 'next/server';
import { calculateValueScore } from '@/lib/value-scoring';
import { generateDemoFundamentals } from '@/lib/demo-data';
import { getCachedFundamentals, setCachedFundamentals } from '@/lib/supabase';
import type { FundamentalMetrics, FundamentalResponse } from '@/types/finance';

function pythonUrl(): string | null {
  const url = process.env.PYTHON_SERVICE_URL;
  if (!url || url.trim() === '') return null;
  return url.trim().replace(/\/+$/, '');
}

const COMPANY_NAMES: Record<string, { name: string; sector: string; industry: string }> = {
  AAPL:  { name: 'Apple Inc.',          sector: 'Technology',            industry: 'Consumer Electronics' },
  MSFT:  { name: 'Microsoft Corp.',     sector: 'Technology',            industry: 'Software' },
  GOOGL: { name: 'Alphabet Inc.',       sector: 'Technology',            industry: 'Internet Services' },
  AMZN:  { name: 'Amazon.com Inc.',     sector: 'Consumer Discretionary',industry: 'E-Commerce' },
  NVDA:  { name: 'NVIDIA Corp.',        sector: 'Technology',            industry: 'Semiconductors' },
  META:  { name: 'Meta Platforms',      sector: 'Technology',            industry: 'Social Media' },
  TSLA:  { name: 'Tesla Inc.',          sector: 'Consumer Discretionary',industry: 'Electric Vehicles' },
  JPM:   { name: 'JPMorgan Chase',      sector: 'Financials',            industry: 'Banking' },
  V:     { name: 'Visa Inc.',           sector: 'Financials',            industry: 'Payment Processing' },
  'BRK-B':{ name: 'Berkshire Hathaway',sector: 'Financials',            industry: 'Diversified' },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get('ticker') ?? 'AAPL').toUpperCase();

  // 1. Supabase cache
  try {
    const cached = await getCachedFundamentals(ticker);
    if (cached) return NextResponse.json({ ...cached, source: 'cache' });
  } catch { /* miss */ }

  // 2. Python microservice (Railway)
  const base = pythonUrl();
  if (base) {
    try {
      const res = await fetch(`${base}/analyze/fundamental/${ticker}`, {
        signal: AbortSignal.timeout(30000),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const pyData = await res.json();
        const response = { ...pyData, source: 'live' };
        try { await setCachedFundamentals(ticker, pyData); } catch { /* ok */ }
        return NextResponse.json(response);
      }
      console.error(`[fundamentals] Railway returned ${res.status} for ${ticker}`);
    } catch (e) {
      console.error(`[fundamentals] Railway fetch failed for ${ticker}:`, e);
    }
  } else {
    console.warn('[fundamentals] PYTHON_SERVICE_URL not set');
  }

  // 3. Yahoo Finance direct
  try {
    const yahooData = await fetchYahooFundamentals(ticker);
    if (yahooData) {
      const value_score = calculateValueScore(yahooData.metrics);
      const companyInfo = COMPANY_NAMES[ticker];
      const response: Omit<FundamentalResponse, 'source'> = {
        ticker,
        company_name: yahooData.company_name || companyInfo?.name || ticker,
        sector:       yahooData.sector       || companyInfo?.sector   || 'N/A',
        industry:     yahooData.industry     || companyInfo?.industry  || 'N/A',
        metrics:      yahooData.metrics,
        value_score,
        last_updated: new Date().toISOString(),
      };
      try { await setCachedFundamentals(ticker, response); } catch { /* ok */ }
      return NextResponse.json({ ...response, source: 'live' });
    }
  } catch (e) {
    console.error(`[fundamentals] Yahoo Finance failed for ${ticker}:`, e);
  }

  // 4. Demo fallback
  console.warn(`[fundamentals] Falling back to demo for ${ticker}`);
  const metrics     = generateDemoFundamentals(ticker);
  const value_score = calculateValueScore(metrics);
  const companyInfo = COMPANY_NAMES[ticker];
  return NextResponse.json({
    ticker,
    company_name: companyInfo?.name     ?? ticker,
    sector:       companyInfo?.sector   ?? 'Technology',
    industry:     companyInfo?.industry ?? 'N/A',
    metrics, value_score,
    last_updated: new Date().toISOString(),
    source: 'demo',
  });
}

async function fetchYahooFundamentals(ticker: string): Promise<{
  company_name: string; sector: string; industry: string; metrics: FundamentalMetrics;
} | null> {
  const modules = 'summaryDetail,defaultKeyStatistics,financialData,assetProfile';
  const url = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${ticker}?modules=${modules}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;

  const json   = await res.json();
  const result = json?.quoteSummary?.result?.[0];
  if (!result) return null;

  const sd = result.summaryDetail       ?? {};
  const ks = result.defaultKeyStatistics ?? {};
  const fd = result.financialData        ?? {};
  const ap = result.assetProfile         ?? {};

  const v = (obj: Record<string, unknown>, key: string): number | null => {
    const raw = obj[key];
    if (raw == null) return null;
    if (typeof raw === 'object' && raw !== null && 'raw' in raw)
      return (raw as { raw: number }).raw ?? null;
    if (typeof raw === 'number') return raw;
    return null;
  };

  const eg = v(fd, 'earningsGrowth');
  const rg = v(fd, 'revenueGrowth');

  const metrics: FundamentalMetrics = {
    eps:                v(ks, 'trailingEps'),
    pe_ratio:           v(sd, 'trailingPE'),
    forward_pe:         v(sd, 'forwardPE'),
    pb_ratio:           v(ks, 'priceToBook'),
    ps_ratio:           v(sd, 'priceToSalesTrailing12Months'),
    peg_ratio:          v(ks, 'pegRatio'),
    profit_margin:      v(fd, 'profitMargins'),
    operating_margin:   v(fd, 'operatingMargins'),
    roe:                v(fd, 'returnOnEquity'),
    roa:                v(fd, 'returnOnAssets'),
    dividend_yield:     v(sd, 'dividendYield'),
    payout_ratio:       v(sd, 'payoutRatio'),
    debt_to_equity:     v(fd, 'debtToEquity'),
    current_ratio:      v(fd, 'currentRatio'),
    quick_ratio:        v(fd, 'quickRatio'),
    revenue_growth_yoy: rg !== null ? rg * 100 : null,
    earnings_growth:    eg !== null ? eg * 100 : null,
    current_price:      v(fd, 'currentPrice') ?? v(sd, 'regularMarketPrice'),
    week52_high:        v(sd, 'fiftyTwoWeekHigh'),
    week52_low:         v(sd, 'fiftyTwoWeekLow'),
    market_cap:         v(sd, 'marketCap'),
  };

  return {
    company_name: ap.longName ?? ap.shortName ?? ticker,
    sector:       ap.sector   ?? 'N/A',
    industry:     ap.industry ?? 'N/A',
    metrics,
  };
}
