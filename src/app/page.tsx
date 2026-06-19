'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import TickerSearch from '@/components/shared/TickerSearch';
import ShortTermOpportunities from '@/components/shared/ShortTermOpportunities';
import OpportunityScanner from '@/components/shared/OpportunityScanner';  // ← añade esta línea
import { POPULAR_TICKERS } from '@/types/finance';
import { formatPrice } from '@/lib/indicators';
import {
  BarChart2, BookOpen, Brain, GitCompare, Star,
  ArrowRight, TrendingUp, TrendingDown, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

interface MarketCard {
  ticker: string;
  price: number;
  changePct: number;
  score: number | null;
  scoreColor: string;
  loaded: boolean;
}

const SECTIONS = [
  {
    href: '/technical', icon: BarChart2, color: 'cyan',
    title: 'Análisis Técnico',
    description: 'Indicadores, patrones y señales de mercado en tiempo real.',
    features: ['SMA 50/200 · EMA 50/200', 'RSI con zonas sobrecompra/venta', 'MACD + histograma', 'Bandas de Bollinger', 'Golden Cross / Death Cross'],
  },
  {
    href: '/fundamental', icon: BookOpen, color: 'green',
    title: 'Análisis Fundamental',
    description: 'Salud financiera con métricas clave y checklist Value Investing.',
    features: ['PER, P/Book, PEG, EPS', 'Márgenes, ROE, ROA', 'Deuda/Equity, Liquidez', 'Crecimiento YoY de ingresos', 'Value Score 0–100 automatizado'],
  },
  {
    href: '/ml', icon: Brain, color: 'purple',
    title: 'Predicción IA',
    description: 'Machine learning entrenado en tiempo real con 3 años de histórico.',
    features: ['Random Forest · Gradient Boosting', '22 features técnicas', 'Bandas de confianza', 'Feature importance', 'MAPE y métricas de error'],
  },
  {
    href: '/compare', icon: GitCompare, color: 'yellow',
    title: 'Comparador',
    description: 'Rendimiento relativo y métricas fundamentales de hasta 4 acciones.',
    features: ['Retorno normalizado 1Y', 'Tabla fundamental paralela', 'Mejor valor resaltado', 'Value Score comparativo'],
  },
  {
    href: '/watchlist', icon: Star, color: 'yellow',
    title: 'Watchlist',
    description: 'Seguimiento de tus acciones favoritas con datos actualizados.',
    features: ['Sincronización en la nube', 'Precio y cambio diario', 'Value Score en tabla', 'Acceso rápido a análisis'],
  },
];

const colorMap: Record<string, { border: string; bg: string; text: string; iconBg: string }> = {
  cyan:   { border: 'hover:border-accent-cyan/40',   bg: 'hover:bg-accent-cyan/5',   text: 'text-accent-cyan',   iconBg: 'bg-accent-cyan/10 border-accent-cyan/30' },
  green:  { border: 'hover:border-accent-green/40',  bg: 'hover:bg-accent-green/5',  text: 'text-accent-green',  iconBg: 'bg-accent-green/10 border-accent-green/30' },
  purple: { border: 'hover:border-accent-purple/40', bg: 'hover:bg-accent-purple/5', text: 'text-accent-purple', iconBg: 'bg-accent-purple/10 border-accent-purple/30' },
  yellow: { border: 'hover:border-accent-yellow/40', bg: 'hover:bg-accent-yellow/5', text: 'text-accent-yellow', iconBg: 'bg-accent-yellow/10 border-accent-yellow/30' },
};

const scoreColorClass: Record<string, string> = {
  green: 'text-accent-green', blue: 'text-accent-cyan',
  yellow: 'text-accent-yellow', red: 'text-accent-red',
};

const PULSE_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META'];

export default function HomePage() {
  const router = useRouter();
  const [ticker, setTicker] = useState('');
  const [marketCards, setMarketCards] = useState<MarketCard[]>(
    PULSE_TICKERS.map(t => ({ ticker: t, price: 0, changePct: 0, score: null, scoreColor: 'blue', loaded: false }))
  );

  useEffect(() => {
    let cancelled = false;
    async function loadPulse() {
      const results = await Promise.all(PULSE_TICKERS.map(async (t) => {
        try {
          const [priceRes, fundRes] = await Promise.all([
            fetch(`/api/prices?ticker=${t}&period=3mo`),
            fetch(`/api/fundamentals?ticker=${t}`),
          ]);
          const priceData = await priceRes.json();
          const fundData  = await fundRes.json();
          const d = priceData.data ?? [];
          const last = d[d.length - 1];
          const prev = d[d.length - 2];
          const vs = fundData.value_score;
          return {
            ticker: t,
            price: last?.close ?? 0,
            changePct: last && prev ? ((last.close - prev.close) / prev.close) * 100 : 0,
            score: vs?.score ?? null,
            scoreColor: vs?.color ?? 'blue',
            loaded: true,
          };
        } catch {
          return { ticker: t, price: 0, changePct: 0, score: null, scoreColor: 'blue', loaded: true };
        }
      }));
      if (!cancelled) setMarketCards(results);
    }
    loadPulse();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary bg-grid">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20">

        {/* Hero */}
        <section className="py-14 sm:py-20 text-center">
          <div className="animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
            <div className="inline-flex items-center gap-2 bg-accent-cyan/10 border border-accent-cyan/25 text-accent-cyan text-xs font-mono px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
              Datos en tiempo real · Yahoo Finance + ML entrenado en vivo
            </div>
            <h1 className="font-display font-extrabold text-5xl sm:text-7xl text-text-primary mb-4 leading-[1.05]">
              Stock<span className="text-accent-cyan">Lens</span>
            </h1>
            <p className="text-text-secondary text-lg sm:text-xl font-sans max-w-2xl mx-auto leading-relaxed mb-10">
              Plataforma profesional de análisis bursátil. Datos reales, modelos ML entrenados en tiempo real.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto mb-10">
              <TickerSearch value={ticker} onChange={setTicker} onSubmit={t => router.push(`/technical?ticker=${t}`)} placeholder="Buscar ticker… AAPL, MSFT, NVDA" />
              <button
                onClick={() => ticker && router.push(`/technical?ticker=${ticker}`)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-accent-cyan text-bg-primary font-mono font-bold rounded-lg hover:bg-accent-cyan/90 transition-all text-sm"
              >
                Analizar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {POPULAR_TICKERS.slice(0, 8).map(t => (
                <button key={t.ticker} onClick={() => router.push(`/technical?ticker=${t.ticker}`)}
                  className="px-3 py-1.5 bg-bg-card border border-border rounded-lg text-xs font-mono text-text-secondary hover:text-accent-cyan hover:border-accent-cyan/30 transition-all">
                  {t.ticker}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Market Pulse — datos reales */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs text-text-muted uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              Market Pulse
            </h2>
            <button onClick={() => router.push('/compare')} className="text-xs font-mono text-text-muted hover:text-accent-cyan flex items-center gap-1 transition-colors">
              Comparar <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {marketCards.map((c, i) => {
              const up = c.changePct >= 0;
              return (
                <button
                  key={c.ticker}
                  onClick={() => router.push(`/technical?ticker=${c.ticker}`)}
                  className="bg-bg-card border border-border rounded-xl p-3 text-left hover:border-border-bright transition-all animate-slide-up opacity-0 group"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm text-accent-cyan group-hover:text-white transition-colors">{c.ticker}</span>
                    {c.loaded && (up ? <TrendingUp className="w-3.5 h-3.5 text-accent-green" /> : <TrendingDown className="w-3.5 h-3.5 text-accent-red" />)}
                  </div>
                  {!c.loaded ? (
                    <>
                      <div className="skeleton h-5 w-16 rounded mb-1" />
                      <div className="skeleton h-3 w-12 rounded" />
                    </>
                  ) : (
                    <>
                      <p className="font-display font-bold text-base text-text-primary">${formatPrice(c.price)}</p>
                      <p className={clsx('text-xs font-mono mt-0.5', up ? 'text-accent-green' : 'text-accent-red')}>
                        {up ? '+' : ''}{c.changePct.toFixed(2)}%
                      </p>
                      {c.score != null && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <span className={clsx('text-xs font-mono', scoreColorClass[c.scoreColor])}>VS {c.score}/100</span>
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>

{/* Short-term opportunities — real momentum scan */}
        <ShortTermOpportunities />

        {/* Multi-signal opportunity scanner */}
        <OpportunityScanner />

        {/* Feature sections */}
        <section className="pb-16">
          <h2 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-5 flex items-center gap-2">
            <span className="w-4 h-px bg-text-muted" /> Herramientas disponibles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECTIONS.map((section, i) => {
              const Icon = section.icon;
              const c = colorMap[section.color];
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className={clsx('group bg-bg-card border border-border rounded-2xl p-5 transition-all duration-300 block animate-slide-up opacity-0', c.border, c.bg)}
                  style={{ animationDelay: `${100 + i * 60}ms`, animationFillMode: 'forwards' }}
                >
                  <div className={clsx('w-10 h-10 rounded-xl border flex items-center justify-center mb-4', c.iconBg)}>
                    <Icon className={clsx('w-5 h-5', c.text)} />
                  </div>
                  <h3 className="font-display font-bold text-base text-text-primary mb-1.5 group-hover:text-white transition-colors">{section.title}</h3>
                  <p className="text-text-secondary text-xs leading-relaxed mb-4">{section.description}</p>
                  <ul className="space-y-1 mb-5">
                    {section.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs font-mono text-text-muted">
                        <span className={clsx('w-1 h-1 rounded-full flex-shrink-0', c.text.replace('text-', 'bg-'))} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className={clsx('flex items-center gap-1.5 text-xs font-mono transition-all', c.text)}>
                    Abrir <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
