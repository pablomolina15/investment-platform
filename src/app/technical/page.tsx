'use client';

import { Suspense } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import TickerSearch from '@/components/shared/TickerSearch';
import MetricCard from '@/components/fundamental/MetricCard';
import ValueScoreCard from '@/components/fundamental/ValueScoreCard';
import type { FundamentalResponse } from '@/types/finance';
import { formatPrice, formatLargeNumber, formatPercent } from '@/lib/indicators';
import { clsx } from 'clsx';
import { RefreshCw, AlertTriangle, Building2, Briefcase, Brain, GitCompare, BarChart2 } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="skeleton h-20 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
      </div>
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="w-4 h-px bg-accent-green inline-block" /> {title}
      </h2>
      {children}
    </div>
  );
}

function FundamentalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initTicker = (searchParams.get('ticker') ?? '').toUpperCase();

  const [inputTicker, setInputTicker] = useState(initTicker);
  const [data, setData]       = useState<FundamentalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [watchlist, setWatchlist] = useLocalStorage<{ticker:string;addedAt:string}[]>('stocklens_watchlist', []);

  const fetchData = useCallback(async (t: string) => {
    if (!t.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/fundamentals?ticker=${t.trim().toUpperCase()}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (initTicker) fetchData(initTicker); }, []); // eslint-disable-line

  const handleSubmit = (t: string) => {
    fetchData(t);
    router.replace(`/fundamental?ticker=${t.toUpperCase()}`);
  };

  const ticker = data?.ticker ?? '';
  const inWatchlist = watchlist.some(w => w.ticker === ticker);
  function toggleWatchlist() {
    if (inWatchlist) setWatchlist(p => p.filter(w => w.ticker !== ticker));
    else setWatchlist(p => [...p, { ticker, addedAt: new Date().toISOString() }]);
  }

  const m = data?.metrics;
  const peColor     = (v: number | null | undefined) => !v ? 'none' as const : v < 15 ? 'green' as const : v < 25 ? 'cyan' as const : v < 40 ? 'yellow' as const : 'red' as const;
  const marginColor = (v: number | null | undefined) => { if (!v) return 'none' as const; const p = v < 1 ? v*100 : v; return p > 20 ? 'green' as const : p > 5 ? 'cyan' as const : 'red' as const; };
  const debtColor   = (v: number | null | undefined) => !v ? 'none' as const : v < 50 ? 'green' as const : v < 100 ? 'yellow' as const : 'red' as const;
  const roeColor    = (v: number | null | undefined) => { if (!v) return 'none' as const; const p = v < 1 ? v*100 : v; return p > 20 ? 'green' as const : p > 10 ? 'cyan' as const : 'red' as const; };
  const growthColor = (v: number | null | undefined) => !v ? 'none' as const : v > 10 ? 'green' as const : v > 0 ? 'cyan' as const : 'red' as const;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12">
      <div className="mb-6 animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <h1 className="font-display font-bold text-3xl sm:text-4xl mb-1">
          Análisis <span className="text-accent-green">Fundamental</span>
        </h1>
        <p className="text-text-secondary text-sm">Salud financiera y Value Investing checklist</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-slide-up opacity-0" style={{ animationDelay: '60ms', animationFillMode: 'forwards' }}>
        <TickerSearch value={inputTicker} onChange={setInputTicker} onSubmit={handleSubmit} />
        <button onClick={() => handleSubmit(inputTicker)} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-accent-green/10 border border-accent-green/30 text-accent-green rounded-lg text-sm font-mono hover:bg-accent-green/20 transition-all disabled:opacity-40">
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          {loading ? 'Cargando…' : 'Analizar'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-accent-red/10 border border-accent-red/30 text-accent-red rounded-lg px-4 py-3 mb-4 text-sm font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">📊</div>
          <p className="font-display text-xl text-text-secondary mb-2">Introduce un ticker para analizar</p>
          <p className="text-sm text-text-muted font-mono">Métricas fundamentales + Value Score automático</p>
        </div>
      )}

      {loading && <Skeleton />}

      {data && !loading && m && (
        <div className="space-y-5 animate-fade-in opacity-0" style={{ animationFillMode: 'forwards' }}>
          {/* Company header */}
          <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-wrap items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-bg-elevated border border-border flex items-center justify-center">
              <Building2 className="w-6 h-6 text-accent-green" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-xl text-text-primary">{data.company_name}</h2>
                <span className="font-mono text-sm text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded border border-accent-cyan/20">{data.ticker}</span>
                {data.source === 'demo' && <span className="text-xs font-mono bg-accent-yellow/10 border border-accent-yellow/30 text-accent-yellow px-2 py-0.5 rounded-full">DEMO</span>}
              </div>
              <p className="text-sm text-text-muted font-mono mt-0.5">{data.sector} · {data.industry}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right mr-2">
                <p className="font-display font-bold text-2xl text-text-primary">${formatPrice(m.current_price)}</p>
                <p className="text-xs text-text-muted font-mono">Cap: {formatLargeNumber(m.market_cap)}</p>
              </div>
              <button onClick={() => router.push('/watchlist')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-border text-text-muted hover:text-accent-yellow hover:border-accent-yellow/30 transition-all">
                <Briefcase className="w-3.5 h-3.5" />
                Portfolio
              </button>
              <button onClick={() => router.push(`/technical?ticker=${data.ticker}`)}
                className="p-1.5 border border-border text-text-muted hover:text-accent-cyan hover:border-accent-cyan/30 rounded-lg transition-all">
                <BarChart2 className="w-4 h-4" />
              </button>
              <button onClick={() => router.push(`/ml?ticker=${data.ticker}`)}
                className="p-1.5 border border-border text-text-muted hover:text-accent-purple hover:border-accent-purple/30 rounded-lg transition-all">
                <Brain className="w-4 h-4" />
              </button>
              <button onClick={() => router.push(`/compare?tickers=${data.ticker}`)}
                className="p-1.5 border border-border text-text-muted hover:text-accent-yellow hover:border-accent-yellow/30 rounded-lg transition-all">
                <GitCompare className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 52w range */}
          {m.week52_high && m.week52_low && m.current_price && (
            <div className="bg-bg-card border border-border rounded-xl px-5 py-4">
              <p className="text-xs font-mono text-text-muted mb-3">Rango 52 semanas</p>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-accent-red">${formatPrice(m.week52_low)}</span>
                <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent-red via-accent-yellow to-accent-green rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, ((m.current_price - m.week52_low) / (m.week52_high - m.week52_low)) * 100))}%` }} />
                </div>
                <span className="text-xs font-mono text-accent-green">${formatPrice(m.week52_high)}</span>
              </div>
              <p className="text-center text-xs font-mono text-text-muted mt-1">
                Actual ${formatPrice(m.current_price)} · {(((m.current_price - m.week52_low) / (m.week52_high - m.week52_low)) * 100).toFixed(0)}% del rango
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 space-y-5">
              <Section title="Valoración">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger">
                  <MetricCard label="PER (P/E)"    value={m.pe_ratio    ? m.pe_ratio.toFixed(1)    : 'N/A'} highlight={peColor(m.pe_ratio)}     description="Precio / Beneficio"          animationDelay={0} />
                  <MetricCard label="PER Forward"  value={m.forward_pe  ? m.forward_pe.toFixed(1)  : 'N/A'}                                       description="Estimado próximo año"         animationDelay={50} />
                  <MetricCard label="P/Book"       value={m.pb_ratio    ? m.pb_ratio.toFixed(2)    : 'N/A'} highlight={m.pb_ratio && m.pb_ratio < 3 ? 'green' : m.pb_ratio && m.pb_ratio < 6 ? 'yellow' : 'red'} description="Precio / Valor contable" animationDelay={100} />
                  <MetricCard label="P/Ventas"     value={m.ps_ratio    ? m.ps_ratio.toFixed(2)    : 'N/A'}                                       description="Price to Sales"               animationDelay={150} />
                  <MetricCard label="PEG Ratio"    value={m.peg_ratio   ? m.peg_ratio.toFixed(2)   : 'N/A'} highlight={m.peg_ratio && m.peg_ratio < 1.5 ? 'green' : m.peg_ratio && m.peg_ratio < 2.5 ? 'yellow' : 'red'} description="P/E ajustado al crecimiento" animationDelay={200} />
                  <MetricCard label="EPS"          value={m.eps         ? `$${formatPrice(m.eps)}` : 'N/A'} trend={m.eps && m.eps > 0 ? 'up' : 'down'} description="Beneficio por acción"    animationDelay={250} />
                </div>
              </Section>
              <Section title="Rentabilidad">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
                  <MetricCard label="Margen Neto"      value={m.profit_margin    != null ? formatPercent(m.profit_margin)    : 'N/A'} highlight={marginColor(m.profit_margin)}  animationDelay={0} />
                  <MetricCard label="Margen Operativo" value={m.operating_margin != null ? formatPercent(m.operating_margin) : 'N/A'}                                            animationDelay={50} />
                  <MetricCard label="ROE"              value={m.roe              != null ? formatPercent(m.roe)              : 'N/A'} highlight={roeColor(m.roe)} description="Return on Equity"   animationDelay={100} />
                  <MetricCard label="ROA"              value={m.roa              != null ? formatPercent(m.roa)              : 'N/A'}                             description="Return on Assets"   animationDelay={150} />
                </div>
              </Section>
              <Section title="Deuda y Liquidez">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger">
                  <MetricCard label="Deuda/Equity"  value={m.debt_to_equity != null ? `${m.debt_to_equity.toFixed(1)}%` : 'N/A'} highlight={debtColor(m.debt_to_equity)} animationDelay={0} />
                  <MetricCard label="Current Ratio" value={m.current_ratio  != null ? m.current_ratio.toFixed(2)        : 'N/A'} highlight={m.current_ratio && m.current_ratio > 1.5 ? 'green' : m.current_ratio && m.current_ratio > 1 ? 'yellow' : 'red'} description="Liquidez a corto" animationDelay={50} />
                  <MetricCard label="Quick Ratio"   value={m.quick_ratio   != null ? m.quick_ratio.toFixed(2)           : 'N/A'} description="Liquidez inmediata" animationDelay={100} />
                </div>
              </Section>
              <Section title="Crecimiento y Dividendos">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
                  <MetricCard label="Crecimiento YoY"  value={m.revenue_growth_yoy != null ? formatPercent(m.revenue_growth_yoy, 1) : 'N/A'} trend={m.revenue_growth_yoy != null ? (m.revenue_growth_yoy > 0 ? 'up' : 'down') : undefined} highlight={growthColor(m.revenue_growth_yoy)} description="Ingresos año sobre año" animationDelay={0} />
                  <MetricCard label="Crec. Beneficios" value={m.earnings_growth    != null ? formatPercent(m.earnings_growth, 1)    : 'N/A'} trend={m.earnings_growth != null ? (m.earnings_growth > 0 ? 'up' : 'down') : undefined} animationDelay={50} />
                  <MetricCard label="Dividend Yield"   value={m.dividend_yield     != null ? formatPercent(m.dividend_yield)         : '—'}   highlight={m.dividend_yield && (m.dividend_yield < 1 ? m.dividend_yield*100 : m.dividend_yield) > 1 ? 'cyan' : 'none'} description="Rentabilidad dividendo" animationDelay={100} />
                  <MetricCard label="Payout Ratio"     value={m.payout_ratio       != null ? formatPercent(m.payout_ratio)           : '—'}   description="% beneficio repartido" animationDelay={150} />
                </div>
              </Section>
            </div>
            <div className="xl:col-span-1 space-y-4">
              <Section title="Value Investing Score">
                <ValueScoreCard valueScore={data.value_score} />
              </Section>
              <div className="bg-bg-card border border-border rounded-xl p-4">
                <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-2">Actualización</p>
                <p className="text-xs font-mono text-text-secondary">{new Date(data.last_updated).toLocaleString('es-ES')}</p>
                <p className="text-xs font-mono text-text-muted mt-1">
                  Fuente: {data.source === 'demo' ? 'Datos demo' : data.source === 'cache' ? 'Caché Supabase' : 'Yahoo Finance'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function FundamentalPage() {
  return (
    <div className="min-h-screen bg-bg-primary bg-grid">
      <Navbar />
      <Suspense fallback={
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12">
          <div className="space-y-3 animate-pulse mt-8">
            <div className="skeleton h-10 w-64 rounded-xl" />
            <div className="skeleton h-20 rounded-xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
            </div>
          </div>
        </main>
      }>
        <FundamentalContent />
      </Suspense>
    </div>
  );
}
