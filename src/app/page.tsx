'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import TickerSearch from '@/components/shared/TickerSearch';
import { POPULAR_TICKERS } from '@/types/finance';
import { formatPrice } from '@/lib/indicators';
import { generateDemoPrices, generateDemoFundamentals } from '@/lib/demo-data';
import { calculateValueScore } from '@/lib/value-scoring';
import {
  BarChart2, BookOpen, Brain, GitCompare, Star,
  ArrowRight, TrendingUp, TrendingDown, Zap, Database,
  Shield, Activity, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

interface MarketCard {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  score: number;
  scoreColor: string;
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
    features: ['Random Forest · Gradient Boosting', '24 features técnicas', 'Bandas de confianza', 'Feature importance', 'MAPE y métricas de error'],
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
    features: ['Persistencia local', 'Precio y cambio diario', 'Value Score en tabla', 'Acceso rápido a análisis'],
  },
];

const colorMap: Record<string, { border: string; bg: string; text: string; iconBg: string; arrow: string }> = {
  cyan:   { border: 'hover:border-accent-cyan/40',   bg: 'hover:bg-accent-cyan/5',   text: 'text-accent-cyan',   iconBg: 'bg-accent-cyan/10 border-accent-cyan/30',   arrow: 'group-hover:text-accent-cyan' },
  green:  { border: 'hover:border-accent-green/40',  bg: 'hover:bg-accent-green/5',  text: 'text-accent-green',  iconBg: 'bg-accent-green/10 border-accent-green/30',  arrow: 'group-hover:text-accent-green' },
  purple: { border: 'hover:border-accent-purple/40', bg: 'hover:bg-accent-purple/5', text: 'text-accent-purple', iconBg: 'bg-accent-purple/10 border-accent-purple/30', arrow: 'group-hover:text-accent-purple' },
  yellow: { border: 'hover:border-accent-yellow/40', bg: 'hover:bg-accent-yellow/5', text: 'text-accent-yellow', iconBg: 'bg-accent-yellow/10 border-accent-yellow/30', arrow: 'group-hover:text-accent-yellow' },
};

const scoreColorClass: Record<string, string> = {
  green: 'text-accent-green', blue: 'text-accent-cyan',
  yellow: 'text-accent-yellow', red: 'text-accent-red',
};

export default function HomePage() {
  const router = useRouter();
  const [ticker, setTicker] = useState('');
  const [marketCards, setMarketCards] = useState<MarketCard[]>([]);

  useEffect(() => {
    const cards = POPULAR_TICKERS.slice(0, 6).map(t => {
      const prices = generateDemoPrices(t.ticker, 5);
      const last = prices[prices.length - 1];
      const prev = prices[prices.length - 2];
      const metrics = generateDemoFundamentals(t.ticker);
      const vs = calculateValueScore(metrics);
      return {
        ticker: t.ticker,
        name: t.name,
        price: last.close,
        change: last.close - prev.close,
        changePct: ((last.close - prev.close) / prev.close) * 100,
        score: vs.score,
        scoreColor: vs.color,
      };
    });
    setMarketCards(cards);
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary bg-grid">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="py-14 sm:py-20 text-center">
          <div className="animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
            <div className="inline-flex items-center gap-2 bg-accent-cyan/10 border border-accent-cyan/25 text-accent-cyan text-xs font-mono px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
              Análisis Técnico · Fundamental · ML Predictions · Comparador · Watchlist
            </div>
            <h1 className="font-display font-extrabold text-5xl sm:text-7xl text-text-primary mb-4 leading-[1.05]">
              Stock<span className="text-accent-cyan">Lens</span>
            </h1>
            <p className="text-text-secondary text-lg sm:text-xl font-sans max-w-2xl mx-auto leading-relaxed mb-10">
              Plataforma profesional de análisis bursátil. Datos de Yahoo Finance,
              modelos ML entrenados en tiempo real, todo gratuito.
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

        {/* ── Live Market Pulse ─────────────────────────────────────────────── */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-accent-green" /> Market Pulse
              <span className="text-accent-yellow/60">(modo demo)</span>
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
                    {up ? <TrendingUp className="w-3.5 h-3.5 text-accent-green" /> : <TrendingDown className="w-3.5 h-3.5 text-accent-red" />}
                  </div>
                  <p className="font-display font-bold text-base text-text-primary">${formatPrice(c.price)}</p>
                  <p className={clsx('text-xs font-mono mt-0.5', up ? 'text-accent-green' : 'text-accent-red')}>
                    {up ? '+' : ''}{c.changePct.toFixed(2)}%
                  </p>
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <span className={clsx('text-xs font-mono', scoreColorClass[c.scoreColor])}>
                      VS {c.score}/100
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Feature sections grid ─────────────────────────────────────────── */}
        <section className="pb-10">
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
                  className={clsx(
                    'group bg-bg-card border border-border rounded-2xl p-5 transition-all duration-300 block animate-slide-up opacity-0',
                    c.border, c.bg
                  )}
                  style={{ animationDelay: `${100 + i * 60}ms`, animationFillMode: 'forwards' }}
                >
                  <div className={clsx('w-10 h-10 rounded-xl border flex items-center justify-center mb-4', c.iconBg)}>
                    <Icon className={clsx('w-5 h-5', c.text)} />
                  </div>
                  <h3 className="font-display font-bold text-base text-text-primary mb-1.5 group-hover:text-white transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-text-secondary text-xs leading-relaxed mb-4">{section.description}</p>
                  <ul className="space-y-1 mb-5">
                    {section.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs font-mono text-text-muted">
                        <span className={clsx('w-1 h-1 rounded-full flex-shrink-0', c.text.replace('text-', 'bg-'))} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className={clsx('flex items-center gap-1.5 text-xs font-mono transition-all', c.text, c.arrow)}>
                    Abrir <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Stack ─────────────────────────────────────────────────────────── */}
        <section className="pb-16">
          <div className="bg-bg-card border border-border rounded-2xl p-6 animate-slide-up opacity-0"
            style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
            <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-4 h-px bg-text-muted" /> Stack · 0€/mes
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Zap,      label: 'Next.js 14',        sub: 'Vercel · Serverless',         color: 'text-white' },
                { icon: Database, label: 'Supabase',           sub: 'PostgreSQL Cache',            color: 'text-accent-green' },
                { icon: Activity, label: 'Yahoo Finance',      sub: 'yfinance · Gratis',           color: 'text-accent-yellow' },
                { icon: Shield,   label: 'FastAPI + sklearn',  sub: 'Railway · ML en Python',      color: 'text-accent-purple' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 bg-bg-elevated rounded-xl">
                  <item.icon className={clsx('w-5 h-5 flex-shrink-0', item.color)} />
                  <div>
                    <p className="text-xs font-mono font-bold text-text-primary">{item.label}</p>
                    <p className="text-xs font-mono text-text-muted">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
