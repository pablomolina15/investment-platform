'use client';

import { Suspense } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import TickerSearch from '@/components/shared/TickerSearch';
import SignalBadges from '@/components/shared/SignalBadges';
import PriceChart from '@/components/charts/PriceChart';
import RSIChart from '@/components/charts/RSIChart';
import MACDChart from '@/components/charts/MACDChart';
import type { TechnicalResponse, Period } from '@/types/finance';
import { formatPrice, formatLargeNumber } from '@/lib/indicators';
import { clsx } from 'clsx';
import { RefreshCw, Settings2, AlertTriangle, Briefcase, Brain, GitCompare } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Extended periods including short-term
const PERIODS: { label: string; value: Period | '1mo' | '5d' | '1d' }[] = [
  { label: '1D',  value: '1d'  },
  { label: '5D',  value: '5d'  },
  { label: '1M',  value: '1mo' },
  { label: '3M',  value: '3mo' },
  { label: '6M',  value: '6mo' },
  { label: '1A',  value: '1y'  },
  { label: '2A',  value: '2y'  },
];

type AnyPeriod = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y';

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="skeleton h-14 rounded-xl" />
      <div className="skeleton h-80 rounded-xl" />
      <div className="skeleton h-20 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-44 rounded-xl" />
        <div className="skeleton h-44 rounded-xl" />
      </div>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

function TechnicalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initTicker = (searchParams.get('ticker') ?? '').toUpperCase();

  const [ticker, setTicker]           = useState(initTicker);
  const [inputTicker, setInputTicker] = useState(initTicker);
  const [period, setPeriod]           = useState<AnyPeriod>('1mo');
  const [data, setData]               = useState<TechnicalResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [showSMA50,  setShowSMA50]    = useState(true);
  const [showSMA200, setShowSMA200]   = useState(false); // hidden by default for short periods
  const [showEMA50,  setShowEMA50]    = useState(false);
  const [showBB,     setShowBB]       = useState(true);
  const [watchlist, setWatchlist]     = useLocalStorage<{ticker:string;addedAt:string}[]>('stocklens_watchlist', []);

  const fetchData = useCallback(async (t: string, p: AnyPeriod) => {
    if (!t.trim()) return;
    setLoading(true); setError(null);
    try {
      // Map short periods to API-compatible values
      const apiPeriod = p === '1d' ? '5d' : p === '5d' ? '1mo' : p === '1mo' ? '3mo' : p;
      const res = await fetch(`/api/prices?ticker=${t.trim().toUpperCase()}&period=${apiPeriod}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json: TechnicalResponse = await res.json();

      // Slice data for shorter periods
      const now = new Date();
      let cutoff: Date | null = null;
      if (p === '1d')  cutoff = new Date(now.getTime() - 1   * 24 * 60 * 60 * 1000);
      if (p === '5d')  cutoff = new Date(now.getTime() - 5   * 24 * 60 * 60 * 1000);
      if (p === '1mo') cutoff = new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000);

      if (cutoff) {
        json.data = json.data.filter(d => new Date(d.date) >= cutoff!);
      }

      setData(json);
      setTicker(t.trim().toUpperCase());
      // Auto-hide SMA200 for short periods (not enough data)
      setShowSMA200(p !== '1d' && p !== '5d' && p !== '1mo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false); }
  }, []);

  useEffect(() => {
    if (initTicker) fetchData(initTicker, period);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (t: string) => {
    fetchData(t, period);
    router.replace(`/technical?ticker=${t.toUpperCase()}`);
  };
  const handlePeriod = (p: AnyPeriod) => {
    setPeriod(p);
    if (ticker) fetchData(ticker, p);
  };

  const inWatchlist = watchlist.some(w => w.ticker === ticker);
  function toggleWatchlist() {
    if (inWatchlist) setWatchlist(prev => prev.filter(w => w.ticker !== ticker));
    else setWatchlist(prev => [...prev, { ticker, addedAt: new Date().toISOString() }]);
  }

  const last  = data?.data[data.data.length - 1];
  const prev  = data?.data[data.data.length - 2];
  const priceChange    = last && prev ? last.close - prev.close : null;
  const priceChangePct = last && prev ? ((last.close - prev.close) / prev.close) * 100 : null;

  const isShortPeriod = period === '1d' || period === '5d' || period === '1mo';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12">
      <div className="mb-5 animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <h1 className="font-display font-bold text-2xl sm:text-4xl mb-1">
          Análisis <span className="text-accent-cyan">Técnico</span>
        </h1>
        <p className="text-text-secondary text-sm hidden sm:block">Indicadores, patrones y señales del mercado</p>
      </div>

      {/* Controls — stacked on mobile */}
      <div className="space-y-3 mb-4 animate-slide-up opacity-0" style={{ animationDelay: '60ms', animationFillMode: 'forwards' }}>
        <div className="flex gap-2">
          <div className="flex-1">
            <TickerSearch value={inputTicker} onChange={setInputTicker} onSubmit={handleSubmit} />
          </div>
          <button onClick={() => fetchData(ticker, period)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-lg text-sm font-mono hover:bg-accent-cyan/20 transition-all disabled:opacity-40 flex-shrink-0">
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span className="hidden sm:inline">{loading ? 'Cargando…' : 'Actualizar'}</span>
          </button>
        </div>

        {/* Period selector — horizontal scroll on mobile */}
        <div className="flex items-center gap-1 bg-bg-card border border-border rounded-lg p-1 overflow-x-auto scrollbar-none">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => handlePeriod(p.value as AnyPeriod)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-mono transition-all whitespace-nowrap flex-shrink-0',
                period === p.value
                  ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                  : 'text-text-muted hover:text-text-primary'
              )}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Indicator toggles — scroll on mobile */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none animate-fade-in opacity-0 pb-1"
        style={{ animationDelay: '120ms', animationFillMode: 'forwards' }}>
        {[
          { label: 'SMA 50',    active: showSMA50,  toggle: () => setShowSMA50(v=>!v),  color: '#ffd166' },
          { label: 'SMA 200',   active: showSMA200, toggle: () => setShowSMA200(v=>!v), color: '#ff3b6b', dim: isShortPeriod },
          { label: 'EMA 50',    active: showEMA50,  toggle: () => setShowEMA50(v=>!v),  color: '#7b61ff' },
          { label: 'Bollinger', active: showBB,     toggle: () => setShowBB(v=>!v),     color: '#7b61ff' },
        ].map(item => (
          <button key={item.label} onClick={item.toggle}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono border transition-all flex-shrink-0',
              item.active ? 'bg-bg-elevated border-border-bright text-text-primary' : 'border-border text-text-muted opacity-50',
              item.dim && 'opacity-30'
            )}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.active ? item.color : '#4a4a6a' }} />
            {item.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-xs font-mono text-text-muted flex-shrink-0">
          <Settings2 className="w-3.5 h-3.5" />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-accent-red/10 border border-accent-red/30 text-accent-red rounded-lg px-4 py-3 mb-4 text-sm font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📈</div>
          <p className="font-display text-xl text-text-secondary mb-2">Busca un ticker para comenzar</p>
          <p className="text-sm text-text-muted font-mono">Ej: AAPL, MSFT, NVDA, TSLA…</p>
        </div>
      )}

      {loading && <Skeleton />}

      {data && !loading && (
        <div className="space-y-3 animate-fade-in opacity-0" style={{ animationFillMode: 'forwards' }}>
          {/* Price bar */}
          <div className="bg-bg-card border border-border rounded-xl px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-xl text-text-primary">{data.ticker}</span>
                {data.source === 'demo' && (
                  <span className="text-xs font-mono bg-accent-yellow/10 border border-accent-yellow/30 text-accent-yellow px-2 py-0.5 rounded-full">DEMO</span>
                )}
              </div>
              {last && (
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-bold text-lg text-text-primary">${formatPrice(last.close)}</span>
                  {priceChange !== null && (
                    <span className={clsx('text-sm font-mono', priceChange >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                      {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange)} ({priceChangePct?.toFixed(2)}%)
                    </span>
                  )}
                </div>
              )}
              {last && (
                <div className="flex gap-3 text-xs font-mono text-text-muted">
                  <span>Vol: <span className="text-text-secondary">{formatLargeNumber(last.volume)}</span></span>
                  <span className="hidden sm:inline">H: <span className="text-text-secondary">${formatPrice(last.high)}</span></span>
                  <span className="hidden sm:inline">L: <span className="text-text-secondary">${formatPrice(last.low)}</span></span>
                </div>
              )}
              {/* Action buttons — scrollable on mobile */}
              <div className="flex gap-1.5 ml-auto overflow-x-auto scrollbar-none">
                <button onClick={() => router.push('/watchlist')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border border-border text-text-muted hover:border-accent-yellow/30 hover:text-accent-yellow transition-all flex-shrink-0">
                  <Briefcase className="w-3 h-3" />
                  <span className="hidden sm:inline">Portfolio</span>
                </button>
                <button onClick={() => router.push(`/ml?ticker=${data.ticker}`)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border border-border text-text-muted hover:border-accent-purple/30 hover:text-accent-purple transition-all flex-shrink-0">
                  <Brain className="w-3 h-3" />
                  <span className="hidden sm:inline">Predecir</span>
                </button>
                <button onClick={() => router.push(`/compare?tickers=${data.ticker}`)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border border-border text-text-muted hover:border-accent-yellow/30 hover:text-accent-yellow transition-all flex-shrink-0">
                  <GitCompare className="w-3 h-3" />
                  <span className="hidden sm:inline">Comparar</span>
                </button>
              </div>
            </div>
          </div>

          {data.signals && <SignalBadges signals={data.signals} />}

          <div className="bg-bg-card border border-border rounded-xl p-3 sm:p-5">
            <PriceChart data={data.data} showSMA50={showSMA50} showSMA200={showSMA200} showEMA50={showEMA50} showBB={showBB} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-bg-card border border-border rounded-xl p-3 sm:p-5"><RSIChart data={data.data} /></div>
            <div className="bg-bg-card border border-border rounded-xl p-3 sm:p-5"><MACDChart data={data.data} /></div>
          </div>

          <div className="bg-bg-card border border-dashed border-border-bright rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-accent-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono font-bold text-sm text-accent-purple">Predicción ML disponible</p>
              <p className="text-xs text-text-muted mt-0.5 hidden sm:block">Random Forest, Gradient Boosting y LSTM a {period === '1d' || period === '5d' ? '3-5' : '5-15'} días.</p>
            </div>
            <button onClick={() => router.push(`/ml?ticker=${data.ticker}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple/15 border border-accent-purple/40 text-accent-purple rounded-lg text-xs font-mono hover:bg-accent-purple/25 transition-all flex-shrink-0">
              IA <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function TechnicalPage() {
  return (
    <div className="min-h-screen bg-bg-primary bg-grid">
      <Navbar />
      <Suspense fallback={
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12">
          <div className="space-y-3 animate-pulse mt-6">
            <div className="skeleton h-8 w-48 rounded-xl" />
            <div className="skeleton h-10 rounded-xl" />
            <div className="skeleton h-80 rounded-xl" />
          </div>
        </main>
      }>
        <TechnicalContent />
      </Suspense>
    </div>
  );
}
