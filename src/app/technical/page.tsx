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
import { RefreshCw, Settings2, AlertTriangle, Star, Brain, GitCompare } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const PERIODS: { label: string; value: Period }[] = [
  { label: '3M', value: '3mo' }, { label: '6M', value: '6mo' },
  { label: '1A', value: '1y'  }, { label: '2A', value: '2y'  },
  { label: '5A', value: '5y'  },
];

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="skeleton h-14 rounded-xl" />
      <div className="skeleton h-96 rounded-xl" />
      <div className="skeleton h-20 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-44 rounded-xl" />
        <div className="skeleton h-44 rounded-xl" />
      </div>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>;
}

// ── Inner component that uses useSearchParams ─────────────────────────────────
function TechnicalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initTicker = (searchParams.get('ticker') ?? '').toUpperCase();

  const [ticker, setTicker]         = useState(initTicker);
  const [inputTicker, setInputTicker] = useState(initTicker);
  const [period, setPeriod]         = useState<Period>('1y');
  const [data, setData]             = useState<TechnicalResponse | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showSMA50,  setShowSMA50]  = useState(true);
  const [showSMA200, setShowSMA200] = useState(true);
  const [showEMA50,  setShowEMA50]  = useState(false);
  const [showBB,     setShowBB]     = useState(true);
  const [watchlist, setWatchlist]   = useLocalStorage<{ticker:string;addedAt:string}[]>('stocklens_watchlist', []);

  const fetchData = useCallback(async (t: string, p: Period) => {
    if (!t.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/prices?ticker=${t.trim().toUpperCase()}&period=${p}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setData(await res.json());
      setTicker(t.trim().toUpperCase());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (initTicker) fetchData(initTicker, period);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (t: string) => {
    fetchData(t, period);
    router.replace(`/technical?ticker=${t.toUpperCase()}`);
  };
  const handlePeriod = (p: Period) => { setPeriod(p); if (ticker) fetchData(ticker, p); };

  const inWatchlist = watchlist.some(w => w.ticker === ticker);
  function toggleWatchlist() {
    if (inWatchlist) setWatchlist(prev => prev.filter(w => w.ticker !== ticker));
    else setWatchlist(prev => [...prev, { ticker, addedAt: new Date().toISOString() }]);
  }

  const last  = data?.data[data.data.length - 1];
  const prev  = data?.data[data.data.length - 2];
  const priceChange    = last && prev ? last.close - prev.close : null;
  const priceChangePct = last && prev ? ((last.close - prev.close) / prev.close) * 100 : null;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12">
      <div className="mb-6 animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <h1 className="font-display font-bold text-3xl sm:text-4xl mb-1">
          Análisis <span className="text-accent-cyan">Técnico</span>
        </h1>
        <p className="text-text-secondary text-sm">Indicadores, patrones y señales del mercado</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 animate-slide-up opacity-0" style={{ animationDelay: '60ms', animationFillMode: 'forwards' }}>
        <TickerSearch value={inputTicker} onChange={setInputTicker} onSubmit={handleSubmit} />
        <div className="flex items-center gap-1 bg-bg-card border border-border rounded-lg p-1">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => handlePeriod(p.value)}
              className={clsx('px-3 py-1.5 rounded-md text-xs font-mono transition-all',
                period === p.value ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30' : 'text-text-muted hover:text-text-primary')}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={() => fetchData(ticker, period)} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan rounded-lg text-sm font-mono hover:bg-accent-cyan/20 transition-all disabled:opacity-40">
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {/* Indicator toggles */}
      <div className="flex flex-wrap gap-2 mb-5 animate-fade-in opacity-0" style={{ animationDelay: '120ms', animationFillMode: 'forwards' }}>
        {[
          { label: 'SMA 50',    active: showSMA50,  toggle: () => setShowSMA50(v=>!v),  color: '#ffd166' },
          { label: 'SMA 200',   active: showSMA200, toggle: () => setShowSMA200(v=>!v), color: '#ff3b6b' },
          { label: 'EMA 50',    active: showEMA50,  toggle: () => setShowEMA50(v=>!v),  color: '#7b61ff' },
          { label: 'Bollinger', active: showBB,     toggle: () => setShowBB(v=>!v),     color: '#7b61ff' },
        ].map(item => (
          <button key={item.label} onClick={item.toggle}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono border transition-all',
              item.active ? 'bg-bg-elevated border-border-bright text-text-primary' : 'border-border text-text-muted opacity-50')}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.active ? item.color : '#4a4a6a' }} />
            {item.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-xs font-mono text-text-muted">
          <Settings2 className="w-3.5 h-3.5" /> Indicadores
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-accent-red/10 border border-accent-red/30 text-accent-red rounded-lg px-4 py-3 mb-4 text-sm font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">📈</div>
          <p className="font-display text-xl text-text-secondary mb-2">Busca un ticker para comenzar</p>
          <p className="text-sm text-text-muted font-mono">Ej: AAPL, MSFT, NVDA, TSLA…</p>
        </div>
      )}

      {loading && <Skeleton />}

      {data && !loading && (
        <div className="space-y-4 animate-fade-in opacity-0" style={{ animationFillMode: 'forwards' }}>
          {/* Price bar */}
          <div className="bg-bg-card border border-border rounded-xl px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-2xl text-text-primary">{data.ticker}</span>
              {data.source === 'demo' && <span className="text-xs font-mono bg-accent-yellow/10 border border-accent-yellow/30 text-accent-yellow px-2 py-0.5 rounded-full">DEMO</span>}
            </div>
            {last && (
              <>
                <div>
                  <span className="font-mono font-bold text-xl text-text-primary">${formatPrice(last.close)}</span>
                  {priceChange !== null && (
                    <span className={clsx('ml-2 text-sm font-mono', priceChange >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                      {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange)} ({priceChangePct?.toFixed(2)}%)
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-xs font-mono text-text-muted">
                  <span>Vol: <span className="text-text-secondary">{formatLargeNumber(last.volume)}</span></span>
                  <span>H: <span className="text-text-secondary">${formatPrice(last.high)}</span></span>
                  <span>L: <span className="text-text-secondary">${formatPrice(last.low)}</span></span>
                </div>
              </>
            )}
            <div className="ml-auto flex gap-2">
              <button onClick={toggleWatchlist}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all',
                  inWatchlist ? 'bg-accent-yellow/15 border-accent-yellow/40 text-accent-yellow' : 'border-border text-text-muted hover:border-accent-yellow/30 hover:text-accent-yellow')}>
                <Star className={clsx('w-3.5 h-3.5', inWatchlist && 'fill-accent-yellow')} />
                {inWatchlist ? 'Guardado' : 'Watchlist'}
              </button>
              <button onClick={() => router.push(`/ml?ticker=${data.ticker}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-border text-text-muted hover:border-accent-purple/30 hover:text-accent-purple transition-all">
                <Brain className="w-3.5 h-3.5" /> Predecir
              </button>
              <button onClick={() => router.push(`/compare?tickers=${data.ticker}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-border text-text-muted hover:border-accent-yellow/30 hover:text-accent-yellow transition-all">
                <GitCompare className="w-3.5 h-3.5" /> Comparar
              </button>
            </div>
          </div>

          {data.signals && <SignalBadges signals={data.signals} />}

          <div className="bg-bg-card border border-border rounded-xl p-4 sm:p-6">
            <PriceChart data={data.data} showSMA50={showSMA50} showSMA200={showSMA200} showEMA50={showEMA50} showBB={showBB} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-bg-card border border-border rounded-xl p-4 sm:p-6"><RSIChart data={data.data} /></div>
            <div className="bg-bg-card border border-border rounded-xl p-4 sm:p-6"><MACDChart data={data.data} /></div>
          </div>

          <div className="bg-bg-card border border-dashed border-border-bright rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent-purple/10 border border-accent-purple/30 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-accent-purple" />
            </div>
            <div className="flex-1">
              <p className="font-mono font-bold text-sm text-accent-purple">Predicción ML disponible</p>
              <p className="text-xs text-text-muted mt-0.5">Random Forest, Gradient Boosting y LSTM con bandas de confianza.</p>
            </div>
            <button onClick={() => router.push(`/ml?ticker=${data.ticker}`)}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent-purple/15 border border-accent-purple/40 text-accent-purple rounded-lg text-xs font-mono hover:bg-accent-purple/25 transition-all flex-shrink-0">
              Ir a IA <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Page export with Suspense wrapper ─────────────────────────────────────────
export default function TechnicalPage() {
  return (
    <div className="min-h-screen bg-bg-primary bg-grid">
      <Navbar />
      <Suspense fallback={
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12">
          <div className="space-y-3 animate-pulse mt-8">
            <div className="skeleton h-10 w-64 rounded-xl" />
            <div className="skeleton h-14 rounded-xl" />
            <div className="skeleton h-96 rounded-xl" />
          </div>
        </main>
      }>
        <TechnicalContent />
      </Suspense>
    </div>
  );
}
