'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, TrendingUp, RefreshCw, AlertTriangle, ChevronRight, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { formatPrice } from '@/lib/indicators';

interface MomentumCandidate {
  ticker: string;
  currentPrice: number;
  changePct5d: number;
  rsi: number;
  trend: string;
  goldenCross: boolean;
  macdBullish: boolean;
  aboveSma50: boolean;
  pctFromBbUpper: number;
  momentumScore: number;
  signals: string[];
}

function scoreColor(score: number) {
  if (score >= 70) return { text: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/30', bar: 'bg-accent-green' };
  if (score >= 50) return { text: 'text-accent-cyan',  bg: 'bg-accent-cyan/10',  border: 'border-accent-cyan/30',  bar: 'bg-accent-cyan' };
  return { text: 'text-accent-yellow', bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/30', bar: 'bg-accent-yellow' };
}

export default function ShortTermOpportunities() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<MomentumCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(false);
    try {
      const res = await fetch('/api/momentum-scan');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCandidates(data.candidates ?? []);
      setScannedAt(data.scanned_at);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="pb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-mono text-xs text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-accent-green" />
            Oportunidades a Corto Plazo
            <span className="text-text-muted/60">(&lt;15 días)</span>
          </h2>
          {scannedAt && (
            <p className="text-xs font-mono text-text-muted mt-1">
              Escaneo en tiempo real · {new Date(scannedAt).toLocaleTimeString('es-ES')}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-accent-green transition-colors disabled:opacity-40"
        >
          <RefreshCw className={clsx('w-3 h-3', loading && 'animate-spin')} />
          Reescanear
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-xl" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 bg-accent-red/10 border border-accent-red/25 text-accent-red rounded-xl px-4 py-3 text-sm font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          No se pudo completar el escaneo. Intenta de nuevo.
        </div>
      )}

      {!loading && !error && candidates.length === 0 && (
        <div className="text-center py-10 bg-bg-card border border-border rounded-xl">
          <Activity className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-sm text-text-muted font-mono">No se encontraron candidatos con momentum fuerte ahora mismo</p>
        </div>
      )}

      {!loading && !error && candidates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {candidates.map((c, i) => {
            const colors = scoreColor(c.momentumScore);
            const up = c.changePct5d >= 0;
            return (
              <button
                key={c.ticker}
                onClick={() => router.push(`/technical?ticker=${c.ticker}`)}
                className={clsx(
                  'text-left bg-bg-card border rounded-xl p-4 hover:border-border-bright transition-all duration-200 animate-slide-up opacity-0 group',
                  colors.border
                )}
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base text-text-primary group-hover:text-accent-cyan transition-colors">
                      {c.ticker}
                    </span>
                    {c.goldenCross && <span title="Golden Cross">🌟</span>}
                  </div>
                  <span className={clsx('text-xs font-mono font-bold px-2 py-0.5 rounded-full border', colors.text, colors.bg, colors.border)}>
                    {c.momentumScore}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-display font-bold text-lg text-text-primary">${formatPrice(c.currentPrice)}</span>
                  <span className={clsx('text-xs font-mono flex items-center gap-0.5', up ? 'text-accent-green' : 'text-accent-red')}>
                    <TrendingUp className={clsx('w-3 h-3', !up && 'rotate-180')} />
                    {up ? '+' : ''}{c.changePct5d.toFixed(1)}% (5d)
                  </span>
                </div>

                <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mb-3">
                  <div
                    className={clsx('h-full rounded-full transition-all duration-700', colors.bar)}
                    style={{ width: `${c.momentumScore}%` }}
                  />
                </div>

                <div className="space-y-1">
                  {c.signals.slice(0, 2).map((sig, j) => (
                    <p key={j} className="text-xs font-mono text-text-secondary flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-accent-green flex-shrink-0" />
                      {sig}
                    </p>
                  ))}
                  {c.signals.length === 0 && (
                    <p className="text-xs font-mono text-text-muted">RSI {c.rsi} · {c.trend === 'bullish' ? 'Alcista' : c.trend === 'bearish' ? 'Bajista' : 'Neutral'}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs font-mono text-text-muted group-hover:text-accent-cyan mt-3 transition-colors">
                  Analizar <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-text-muted font-mono mt-4 opacity-60">
        ⚠ Análisis técnico automatizado (momentum, RSI, MACD, Bollinger). No constituye recomendación de inversión — siempre haz tu propio análisis.
      </p>
    </section>
  );
}
