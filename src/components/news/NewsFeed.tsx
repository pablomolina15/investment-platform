'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Newspaper, Clock, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  ticker?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface Props {
  ticker?: string;
  maxItems?: number;
  compact?: boolean;
}

// Naive client-side sentiment from keywords
function detectSentiment(title: string): 'positive' | 'negative' | 'neutral' {
  const t = title.toLowerCase();
  const pos = ['superan', 'sólido', 'crece', 'eleva', 'récord', 'ganancia', 'beat', 'surge', 'rally', 'growth', 'expande', 'nuevo contrato', 'recompra', 'dividendo'];
  const neg = ['caída', 'pierde', 'baja', 'recorte', 'riesgo', 'pérdida', 'miss', 'decline', 'warning', 'layoff', 'despido', 'multa', 'demanda'];
  if (pos.some(w => t.includes(w))) return 'positive';
  if (neg.some(w => t.includes(w))) return 'negative';
  return 'neutral';
}

export default function NewsFeed({ ticker, maxItems = 6, compact = false }: Props) {
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  async function load() {
    setLoading(true); setError(false);
    try {
      const url = ticker ? `/api/news?ticker=${ticker}` : '/api/news';
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const enriched = (data.news as NewsItem[]).map(n => ({
        ...n,
        sentiment: detectSentiment(n.title),
      }));
      setNews(enriched.slice(0, maxItems));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [ticker]); // eslint-disable-line

  const sentimentIcon = (s?: string) => {
    if (s === 'positive') return <TrendingUp  className="w-3 h-3 text-accent-green flex-shrink-0" />;
    if (s === 'negative') return <TrendingDown className="w-3 h-3 text-accent-red   flex-shrink-0" />;
    return <Minus className="w-3 h-3 text-text-muted flex-shrink-0" />;
  };

  const sentimentDot = (s?: string) =>
    s === 'positive' ? 'bg-accent-green' : s === 'negative' ? 'bg-accent-red' : 'bg-text-muted';

  if (compact) {
    return (
      <div className="space-y-2">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-12 rounded-lg" />
        ))}
        {!loading && news.map((item, i) => (
          <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
            className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-bg-elevated transition-colors group">
            <span className={clsx('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', sentimentDot(item.sentiment))} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-sans text-text-secondary group-hover:text-text-primary transition-colors leading-snug line-clamp-2">{item.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-text-muted">{item.source}</span>
                <span className="text-xs text-text-muted">·</span>
                <span className="text-xs font-mono text-text-muted">
                  {formatDistanceToNow(new Date(item.publishedAt), { locale: es, addSuffix: true })}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-accent-cyan" />
          <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider">
            {ticker ? `Noticias · ${ticker}` : 'Noticias del mercado'}
          </h3>
        </div>
        <button onClick={load} disabled={loading}
          className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-all disabled:opacity-40">
          <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-8 text-text-muted">
          <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs font-mono">No se pudieron cargar las noticias</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {news.map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 p-3.5 rounded-xl border border-border hover:border-border-bright hover:bg-bg-elevated transition-all group animate-slide-up opacity-0"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}>

              <div className="flex-shrink-0 mt-0.5">
                {sentimentIcon(item.sentiment)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-sans text-text-secondary group-hover:text-text-primary transition-colors leading-snug mb-1.5">
                  {item.title}
                </p>
                {item.summary && (
                  <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mb-2">{item.summary}</p>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-muted bg-bg-elevated px-2 py-0.5 rounded border border-border">
                    {item.source}
                  </span>
                  {item.ticker && (
                    <span className="text-xs font-mono text-accent-cyan">{item.ticker}</span>
                  )}
                  <span className="flex items-center gap-1 text-xs font-mono text-text-muted ml-auto">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(item.publishedAt), { locale: es, addSuffix: true })}
                  </span>
                </div>
              </div>

              <ExternalLink className="w-3.5 h-3.5 text-text-muted group-hover:text-accent-cyan flex-shrink-0 mt-0.5 transition-colors" />
            </a>
          ))}
        </div>
      )}

      {/* Sentiment summary */}
      {!loading && news.length > 0 && (
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
          <p className="text-xs font-mono text-text-muted">Sentimiento:</p>
          {(['positive', 'neutral', 'negative'] as const).map(s => {
            const count = news.filter(n => n.sentiment === s).length;
            const label = s === 'positive' ? '▲ Positivo' : s === 'negative' ? '▼ Negativo' : '— Neutral';
            const color = s === 'positive' ? 'text-accent-green' : s === 'negative' ? 'text-accent-red' : 'text-text-muted';
            return count > 0 ? (
              <span key={s} className={clsx('text-xs font-mono', color)}>
                {label} ({count})
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
