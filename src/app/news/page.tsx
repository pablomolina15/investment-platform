'use client';

import { useState } from 'react';
import Navbar from '@/components/shared/Navbar';
import NewsFeed from '@/components/news/NewsFeed';
import TickerSearch from '@/components/shared/TickerSearch';
import { POPULAR_TICKERS } from '@/types/finance';
import { Newspaper, Globe, Search } from 'lucide-react';
import { clsx } from 'clsx';

const QUICK_TICKERS = POPULAR_TICKERS.slice(0, 8);

export default function NewsPage() {
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [input, setInput] = useState('');

  return (
    <div className="min-h-screen bg-bg-primary bg-grid">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12">

        {/* Header */}
        <div className="mb-6 animate-slide-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center">
              <Newspaper className="w-4 h-4 text-accent-cyan" />
            </div>
            <span className="text-xs font-mono text-accent-cyan uppercase tracking-widest">News Feed</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-1">
            Noticias <span className="text-accent-cyan">Financieras</span>
          </h1>
          <p className="text-text-secondary text-sm">RSS de Yahoo Finance · Análisis de sentimiento · Tiempo real</p>
        </div>

        {/* Ticker filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5 animate-slide-up opacity-0" style={{ animationDelay: '60ms', animationFillMode: 'forwards' }}>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter' && input) { setActiveTicker(input); setInput(''); } }}
              placeholder="Filtrar por ticker…"
              className="w-full pl-10 pr-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setActiveTicker(null)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-mono border transition-all flex items-center gap-1.5',
                !activeTicker ? 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan' : 'border-border text-text-muted hover:text-text-primary')}
            >
              <Globe className="w-3 h-3" /> Mercado
            </button>
            {QUICK_TICKERS.map(t => (
              <button
                key={t.ticker}
                onClick={() => setActiveTicker(activeTicker === t.ticker ? null : t.ticker)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-mono border transition-all',
                  activeTicker === t.ticker
                    ? 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan'
                    : 'border-border text-text-muted hover:text-text-primary hover:border-border-bright')}
              >
                {t.ticker}
              </button>
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main feed */}
          <div className="lg:col-span-2 bg-bg-card border border-border rounded-2xl p-5 animate-slide-up opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <NewsFeed ticker={activeTicker ?? undefined} maxItems={12} />
          </div>

          {/* Sidebar: top picks */}
          <div className="space-y-4">
            {['AAPL', 'NVDA', 'MSFT'].map((t, i) => (
              <div
                key={t}
                className="bg-bg-card border border-border rounded-xl p-4 animate-slide-up opacity-0"
                style={{ animationDelay: `${120 + i * 60}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-sm text-accent-cyan">{t}</span>
                  <button
                    onClick={() => setActiveTicker(t)}
                    className="text-xs font-mono text-text-muted hover:text-accent-cyan transition-colors"
                  >
                    Ver todo →
                  </button>
                </div>
                <NewsFeed ticker={t} maxItems={3} compact />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
