import { NextRequest, NextResponse } from 'next/server';
import { calculateValueScore } from '@/lib/value-scoring';
import { generateDemoFundamentals } from '@/lib/demo-data';
import { getCachedFundamentals, setCachedFundamentals } from '@/lib/supabase';
import type { FundamentalMetrics, FundamentalResponse } from '@/types/finance';

const COMPANY_NAMES: Record<string, { name: string; sector: string; industry: string }> = {
  AAPL: { name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
  MSFT: { name: 'Microsoft Corp.', sector: 'Technology', industry: 'Software' },
  GOOGL: { name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Services' },
  AMZN: { name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', industry: 'E-Commerce' },
  NVDA: { name: 'NVIDIA Corp.', sector: 'Technology', industry: 'Semiconductors' },
  META: { name: 'Meta Platforms', sector: 'Technology', industry: 'Social Media' },
  TSLA: { name: 'Tesla Inc.', sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
  JPM: { name: 'JPMorgan Chase', sector: 'Financials', industry: 'Banking' },
  V: { name: 'Visa Inc.', sector: 'Financials', industry: 'Payment Processing' },
  'BRK-B': { name: 'Berkshire Hathaway', sector: 'Financials', industry: 'Diversified' },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get('ticker') ?? 'AAPL').toUpperCase();

  // 1. Cache check
  const cached = await getCachedFundamentals(ticker);
  if (cached) return NextResponse.json({ ...cached, source: 'cache' });

  // 2. Python microservice
  const pythonUrl = process.env.PYTHON_SERVICE_URL;
  if (pythonUrl) {
    try {
      const res = await fetch(`${pythonUrl}/analyze/fundamental/${ticker}`);
      if (res.ok) {
        const pyData = await res.json();
        await setCachedFundamentals(ticker, pyData);
        return NextResponse.json({ ...pyData, source: 'live' });
      }
    } catch { /* fall through */ }
  }

  // 3. Yahoo Finance quote summary (unofficial)
  try {
    const yahooData = await fetchYahooFundamentals(ticker);
    if (yahooData) {
      const value_score = calculateValueScore(yahooData.metrics);
      const companyInfo = COMPANY_NAMES[ticker];
      const response: Omit<FundamentalResponse, 'source'> = {
        ticker,
        company_name: yahooData.company_name || companyInfo?.name || ticker,
        sector: yahooData.sector || companyInfo?.sector || 'N/A',
        industry: yahooData.industry || companyInfo?.industry || 'N/A',
        metrics: yahooData.metrics,
        value_score,
        last_updated: new Date().toISOString(),
      };
      await setCachedFundamentals(ticker, response);
      return NextResponse.json({ ...response, source: 'live' });
    }
  } catch { /* fall through */ }

  // 4. Demo fallback
  const metrics = generateDemoFundamentals(ticker);
  const value_score = calculateValueScore(metrics);
  const companyInfo = COMPANY_NAMES[ticker];

  const demoResponse: Omit<FundamentalResponse, 'source'> = {
    ticker,
    company_name: companyInfo?.name ?? ticker,
    sector: companyInfo?.sector ?? 'Technology',
    industry: companyInfo?.industry ?? 'N/A',
    metrics,
    value_score,
    last_updated: new Date().toISOString(),
  };

  return NextResponse.json({ ...demoResponse, source: 'demo' });
}

async function fetchYahooFundamentals(ticker: string): Promise<{
  company_name: string;
  sector: string;
  industry: string;
  metrics: FundamentalMetrics;
} | null> {
  const modules = 'summaryDetail,defaultKeyStatistics,financialData,assetProfile';
  const url = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${ticker}?modules=${modules}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    next: { revalidate: 86400 },
  });

  if (!res.ok) return null;

  const json = await res.json();
  const result = json?.quoteSummary?.result?.[0];
  if (!result) return null;

  const sd = result.summaryDetail ?? {};
  const ks = result.defaultKeyStatistics ?? {};
  const fd = result.financialData ?? {};
  const ap = result.assetProfile ?? {};

  const v = (obj: Record<string, unknown>, key: string): number | null => {
    const raw = obj[key];
    if (raw == null) return null;
    if (typeof raw === 'object' && raw !== null && 'raw' in raw) return (raw as { raw: number }).raw ?? null;
    if (typeof raw === 'number') return raw;
    return null;
  };

  const metrics: FundamentalMetrics = {
    eps: v(ks, 'trailingEps'),
    pe_ratio: v(sd, 'trailingPE'),
    forward_pe: v(sd, 'forwardPE'),
    pb_ratio: v(ks, 'priceToBook'),
    ps_ratio: v(sd, 'priceToSalesTrailing12Months'),
    peg_ratio: v(ks, 'pegRatio'),
    profit_margin: v(fd, 'profitMargins'),
    operating_margin: v(fd, 'operatingMargins'),
    roe: v(fd, 'returnOnEquity'),
    roa: v(fd, 'returnOnAssets'),
    dividend_yield: v(sd, 'dividendYield'),
    payout_ratio: v(sd, 'payoutRatio'),
    debt_to_equity: v(fd, 'debtToEquity'),
    current_ratio: v(fd, 'currentRatio'),
    quick_ratio: v(fd, 'quickRatio'),
    revenue_growth_yoy: (() => {
      const g = v(fd, 'revenueGrowth');
      return g !== null ? g * 100 : null;
    })(),
    earnings_growth: (() => {
      const g = v(fd, 'earningsGrowth');
      return g !== null ? g * 100 : null;
    })(),
    current_price: v(fd, 'currentPrice'),
    week52_high: v(sd, 'fiftyTwoWeekHigh'),
    week52_low: v(sd, 'fiftyTwoWeekLow'),
    market_cap: v(sd, 'marketCap'),
  };

  return {
    company_name: ap.longName ?? ap.shortName ?? ticker,
    sector: ap.sector ?? 'N/A',
    industry: ap.industry ?? 'N/A',
    metrics,
  };
}
