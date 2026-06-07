'use client';

import { useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import ComparisonChart from '@/components/compare/ComparisonChart';
import { formatPercent, formatPrice, formatLargeNumber } from '@/lib/indicators';
import { clsx } from 'clsx';
import { Plus, X, RefreshCw, GitCompare, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CompResult {
  ticker: string;
  normalized: Array<{ date: string; return: number }>;
  currentPrice: number;
  source: string;
}

interface FundResult {
  ticker: string;
  metrics?: {
    pe_ratio?: number | null;
    pb_ratio?: number | null;
    profit_margin?: number | null;
    roe?: number | null;
    debt_to_equity?: number | null;
    dividend_yield?: number | null;
    revenue_growth_yoy?: number | null;
    market_cap?: number | null;
  };
  value_score?: { score: number; rating: string; color: string };
  source?: string;
}

const DEFAULT_TICKERS = ['AAPL', 'MSFT', 'GOOGL'];
const METRIC_COLS = [
  { key: 'pe_ratio', label: 'P/E', fmt: (v: number | null | undefined) => v != null ? v.toFixed(1) : 'N/A', better: 'lower' },
  { key: 'pb_ratio', label: 'P/B', fmt: (v: number | null | undefined) => v != null ? v.toFixed(2) : 'N/A', better: 'lower' },
  { key: 'profit_margin', label: 'Margen', fmt: (v: number | null | undefined) => v != null ? formatPercent(v) : 'N/A', better: 'higher' },
  { key: 'roe', label: 'ROE', fmt: (v: number | null | undefined) => v != null ? formatPercent(v) : 'N/A', better: 'higher' },
  { key: 'debt_to_equity', label: 'D/E', fmt: (v: number | null | undefined) => v != null ? `${v.toFixed(0)}%` : 'N/A', better: 'lower' },
  { key: 'revenue_growth_yoy', label: 'Crec. YoY', fmt: (v: number | null | undefined) => v != null ? formatPercent(v, 1) : 'N/A', better: 'higher' },
  { key: 'market_cap', label: 'Cap.', fmt: (v: number | null | undefined) => v != null ? formatLargeNumber(v) : 'N/A', better: 'none' },
];

const scoreColor: Record<string, string> = {
  green: 'text-accent-green', blue: 'text-accent-cyan',
  yellow: 'text-accent-yellow', red: 'text-accent-red',
};

export default function ComparePage() {
  const [tickers, setTickers] = useState<string[]>(DEFAULT_TICKERS);
  const [input, setInput] = useState('');
  const [comparisons, setComparisons] = useState<CompResult[]>([]);
  const [fundamentals, setFundamentals] = useState<FundResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTicker() {
    const t = input.trim().toUpperCase();
    if (!t || tickers.includes(t) || tickers.length >= 4) return;
    setTickers(prev => [...prev, t]);
    setInput('');
  }

  function removeTicker(t: string) {
    setTickers(prev => prev.filter(x => x !== t));
  }

  async function runComparison() {
    if (tickers.length < 1) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/compare?tickers=${tickers.join(',')}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setComparisons(data.comparisons ?? []);
      setFundamentals(data.fundamentals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  // Find best value per metric
  function getBest(metricKey: string, better: string): string | null {
    if (better === 'none') return null;
    const vals = fundamentals.map(f => ({
      ticker: f.ticker,
      val: f.metrics?.[metricKey as keyof typeof f.metrics] as number | null | undefined,
    })).filter(x => x.val != null);
    if (!vals.length) return null;
    const best = better === 'higher'
      ? vals.reduce((a, b) => (b.val! > a.val! ? b : a))
      : vals.reduce((a, b) => (b.val! < a.val! ? b : a));
    return best.ticker;
  }

  const TICKER_COLORS = ['#00d4ff', '#00ff88', '#ffd166', '#ff3b6b'];

  return (
    <div className="min-h-screen bg-bg-primary bg-grid">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12">

        {/* Header */}
        <div className="mb-8 animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent-yellow/20 border border-accent-yellow/40 flex items-center justify-center">
              <GitCompare className="w-4 h-4 text-accent-yellow" />
            </div>
            <span className="text-xs font-mono text-accent-yellow uppercase tracking-widest">Comparador</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-1">
            Comparar <span className="text-accent-yellow">Acciones</span>
          </h1>
          <p className="text-text-secondary text-sm">Rendimiento relativo y métricas fundamentales lado a lado</p>
        </div>

        {/* Ticker builder */}
        <div className="bg-bg-card border border-border rounded-2xl p-5 mb-6 animate-slide-up opacity-0" style={{ animationDelay: '80ms', animationFillMode: 'forwards' }}>
          <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Selecciona hasta 4 acciones</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {tickers.map((t, i) => (
              <div
                key={t}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono font-bold"
                style={{ borderColor: `${TICKER_COLORS[i]}40`, color: TICKER_COLORS[i], background: `${TICKER_COLORS[i]}10` }}
              >
                {t}
                <button onClick={() => removeTicker(t)} className="opacity-60 hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {tickers.length < 4 && (
              <div className="flex gap-1.5">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && addTicker()}
                  placeholder="+ ticker"
                  className="w-24 px-3 py-1.5 bg-bg-elevated border border-border rounded-lg text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-yellow/50 transition-colors"
                />
                <button
                  onClick={addTicker}
                  className="px-3 py-1.5 bg-bg-elevated border border-border rounded-lg text-text-muted hover:text-accent-yellow hover:border-accent-yellow/40 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={runComparison}
            disabled={loading || tickers.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-yellow/15 border border-accent-yellow/40 text-accent-yellow font-mono font-bold rounded-lg text-sm hover:bg-accent-yellow/25 transition-all disabled:opacity-40"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
            {loading ? 'Comparando…' : `Comparar ${tickers.join(' vs ')}`}
          </button>
        </div>

        {error && (
          <div className="bg-accent-red/10 border border-accent-red/30 text-accent-red rounded-xl px-4 py-3 mb-6 text-sm font-mono">
            {error}
          </div>
        )}

        {comparisons.length > 0 && (
          <div className="space-y-5 animate-fade-in opacity-0" style={{ animationFillMode: 'forwards' }}>

            {/* Performance chart */}
            <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-7">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-display font-bold text-lg text-text-primary">Rentabilidad relativa</p>
                  <p className="text-xs text-text-muted font-mono">Retorno normalizado desde inicio del período (1 año)</p>
                </div>
                <div className="flex gap-2">
                  {comparisons.map((c, i) => (
                    <span key={c.ticker} className="text-xs font-mono font-bold px-2 py-1 rounded border"
                      style={{ color: TICKER_COLORS[i], borderColor: `${TICKER_COLORS[i]}40`, background: `${TICKER_COLORS[i]}10` }}>
                      {c.ticker}
                    </span>
                  ))}
                </div>
              </div>
              <ComparisonChart series={comparisons} />
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {comparisons.map((c, i) => {
                const lastReturn = c.normalized[c.normalized.length - 1]?.return ?? 0;
                const up = lastReturn >= 0;
                return (
                  <div key={c.ticker} className="bg-bg-card border rounded-xl p-4"
                    style={{ borderColor: `${TICKER_COLORS[i]}30` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-sm" style={{ color: TICKER_COLORS[i] }}>{c.ticker}</span>
                      {up ? <TrendingUp className="w-4 h-4 text-accent-green" /> : <TrendingDown className="w-4 h-4 text-accent-red" />}
                    </div>
                    <p className="font-display font-bold text-xl text-text-primary">${formatPrice(c.currentPrice)}</p>
                    <p className={clsx('text-sm font-mono mt-0.5', up ? 'text-accent-green' : 'text-accent-red')}>
                      {up ? '+' : ''}{lastReturn.toFixed(2)}% YTD
                    </p>
                    {c.source === 'demo' && (
                      <span className="text-xs font-mono text-accent-yellow/60">demo</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Fundamental comparison table */}
            {fundamentals.length > 0 && (
              <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <p className="font-display font-bold text-lg text-text-primary">Comparativa fundamental</p>
                  <p className="text-xs text-text-muted font-mono">Celdas en verde = mejor valor del grupo</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-3 text-xs font-mono text-text-muted uppercase tracking-wider w-32">Métrica</th>
                        {fundamentals.map((f, i) => (
                          <th key={f.ticker} className="text-right px-5 py-3 text-xs font-mono font-bold"
                            style={{ color: TICKER_COLORS[i] }}>
                            {f.ticker}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {METRIC_COLS.map(col => {
                        const best = getBest(col.key, col.better);
                        return (
                          <tr key={col.key} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                            <td className="px-5 py-3 text-xs font-mono text-text-muted">{col.label}</td>
                            {fundamentals.map((f, i) => {
                              const raw = f.metrics?.[col.key as keyof typeof f.metrics] as number | null | undefined;
                              const isBest = best === f.ticker;
                              return (
                                <td key={f.ticker} className="text-right px-5 py-3">
                                  <span className={clsx(
                                    'text-sm font-mono font-bold px-2 py-0.5 rounded',
                                    isBest ? 'bg-accent-green/15 text-accent-green' : 'text-text-primary'
                                  )}>
                                    {col.fmt(raw)}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Value score row */}
                      <tr className="bg-bg-elevated/30">
                        <td className="px-5 py-3 text-xs font-mono text-text-muted uppercase tracking-wider">Value Score</td>
                        {fundamentals.map((f, i) => {
                          const vs = f.value_score;
                          return (
                            <td key={f.ticker} className="text-right px-5 py-3">
                              {vs ? (
                                <span className={clsx('text-sm font-mono font-bold', scoreColor[vs.color] ?? 'text-text-primary')}>
                                  {vs.score}/100 · {vs.rating}
                                </span>
                              ) : <span className="text-text-muted text-sm font-mono">N/A</span>}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!comparisons.length && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚖️</div>
            <p className="font-display text-xl text-text-secondary mb-2">Añade acciones y compara</p>
            <p className="text-sm text-text-muted font-mono">Rendimiento relativo, métricas fundamentales y Value Score en paralelo</p>
          </div>
        )}
      </main>
    </div>
  );
}
