'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, TrendingUp, RefreshCw, AlertTriangle, ChevronRight,
  Activity, Clock, FileText, Newspaper, BarChart2, Cpu,
  FlaskConical, Handshake, Star, TrendingDown, Info,
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatPrice } from '@/lib/indicators';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Catalyst {
  type: string;
  headline: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  source: string;
  recency_hours: number;
}

interface Technicals {
  signals: string[];
  rsi: number;
  trend: string;
  macd_bullish: boolean;
  change_pct_1d: number;
  change_pct_5d: number;
  volume_ratio: number;
}

interface Scores {
  catalyst: number;
  technical: number;
  momentum: number;
  composite: number;
}

interface Opportunity {
  ticker: string;
  company_name: string;
  current_price: number;
  sector: string;
  scores: Scores;
  catalysts: Catalyst[];
  technicals: Technicals;
  flags: { has_sec_filing: boolean };
}

interface ScanResult {
  opportunities: Opportunity[];
  scanned_at: string;
  universe_size: number;
  candidates_found: number;
  scan_duration_s: number;
  cache_ttl_min: number;
  disclaimer: string;
}

// ─── Catalyst config ──────────────────────────────────────────────────────────
const CATALYST_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  earnings_beat:    { label: 'Resultados ↑',   color: 'text-accent-green  bg-accent-green/10  border-accent-green/30',  icon: TrendingUp  },
  earnings_miss:    { label: 'Resultados ↓',   color: 'text-accent-red    bg-accent-red/10    border-accent-red/30',    icon: TrendingDown },
  guidance_raise:   { label: 'Guidance ↑',     color: 'text-accent-green  bg-accent-green/10  border-accent-green/30',  icon: TrendingUp  },
  guidance_cut:     { label: 'Guidance ↓',     color: 'text-accent-red    bg-accent-red/10    border-accent-red/30',    icon: TrendingDown },
  fda_approval:     { label: 'FDA Aprobación', color: 'text-accent-cyan   bg-accent-cyan/10   border-accent-cyan/30',   icon: FlaskConical },
  fda_catalyst:     { label: 'FDA Catalizador',color: 'text-accent-cyan   bg-accent-cyan/10   border-accent-cyan/30',   icon: FlaskConical },
  fda_rejection:    { label: 'FDA Rechazo',    color: 'text-accent-red    bg-accent-red/10    border-accent-red/30',    icon: FlaskConical },
  clinical_trial:   { label: 'Trial Positivo', color: 'text-accent-cyan   bg-accent-cyan/10   border-accent-cyan/30',   icon: FlaskConical },
  contract:         { label: 'Contrato',       color: 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/30', icon: FileText    },
  gov_contract:     { label: 'Contrato Gov.',  color: 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/30', icon: FileText    },
  partnership:      { label: 'Acuerdo',        color: 'text-accent-purple bg-accent-purple/10 border-accent-purple/30', icon: Handshake  },
  ma_activity:      { label: 'M&A',            color: 'text-accent-purple bg-accent-purple/10 border-accent-purple/30', icon: Handshake  },
  analyst_upgrade:  { label: 'Upgrade',        color: 'text-accent-green  bg-accent-green/10  border-accent-green/30',  icon: Star        },
  analyst_downgrade:{ label: 'Downgrade',      color: 'text-accent-red    bg-accent-red/10    border-accent-red/30',    icon: TrendingDown },
  macro_positive:   { label: 'Macro ↑',        color: 'text-accent-cyan   bg-accent-cyan/10   border-accent-cyan/30',   icon: BarChart2   },
  macro_negative:   { label: 'Macro ↓',        color: 'text-accent-red    bg-accent-red/10    border-accent-red/30',    icon: BarChart2   },
  buyback:          { label: 'Recompra',        color: 'text-accent-green  bg-accent-green/10  border-accent-green/30',  icon: TrendingUp  },
  dividend_raise:   { label: 'Dividendo ↑',    color: 'text-accent-green  bg-accent-green/10  border-accent-green/30',  icon: TrendingUp  },
  product_launch:   { label: 'Lanzamiento',    color: 'text-accent-cyan   bg-accent-cyan/10   border-accent-cyan/30',   icon: Zap         },
  ai_catalyst:      { label: 'IA / GPU',       color: 'text-accent-purple bg-accent-purple/10 border-accent-purple/30', icon: Cpu         },
};

function CatalystBadge({ type }: { type: string }) {
  const cfg = CATALYST_CONFIG[type] ?? {
    label: type.replace(/_/g, ' '),
    color: 'text-text-muted bg-bg-elevated border-border',
    icon: Activity,
  };
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-mono font-medium', cfg.color)}>
      <Icon className="w-2.5 h-2.5 flex-shrink-0" />
      {cfg.label}
    </span>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({
  label, score, color,
}: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{label}</span>
        <span className={clsx('text-[10px] font-mono font-bold', color)}>{score}</span>
      </div>
      <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', color.replace('text-', 'bg-'))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function scoreBarColor(score: number): string {
  if (score >= 65) return 'text-accent-green';
  if (score >= 40) return 'text-accent-cyan';
  if (score >= 20) return 'text-accent-yellow';
  return 'text-accent-red';
}

function compositeRing(score: number) {
  if (score >= 70) return { text: 'text-accent-green',  border: 'border-accent-green/60',  bg: 'bg-accent-green/10'  };
  if (score >= 50) return { text: 'text-accent-cyan',   border: 'border-accent-cyan/60',   bg: 'bg-accent-cyan/10'   };
  if (score >= 30) return { text: 'text-accent-yellow', border: 'border-accent-yellow/60', bg: 'bg-accent-yellow/10' };
  return             { text: 'text-text-muted',         border: 'border-border',            bg: 'bg-bg-elevated'      };
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function OpportunityCard({ opp, index, onClick }: {
  opp: Opportunity;
  index: number;
  onClick: () => void;
}) {
  const ring   = compositeRing(opp.scores.composite);
  const up1d   = opp.technicals.change_pct_1d >= 0;
  const up5d   = opp.technicals.change_pct_5d >= 0;
  const bullishCats = opp.catalysts.filter(c => c.sentiment === 'bullish');
  const bearishCats = opp.catalysts.filter(c => c.sentiment === 'bearish');

  return (
    <button
      onClick={onClick}
      className={clsx(
        'text-left w-full bg-bg-card border rounded-xl p-4 hover:border-border-bright',
        'transition-all duration-200 animate-slide-up opacity-0 group',
        ring.border,
      )}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-base text-text-primary group-hover:text-accent-cyan transition-colors">
              {opp.ticker}
            </span>
            {opp.flags.has_sec_filing && (
              <span className="text-[9px] font-mono font-bold text-accent-yellow bg-accent-yellow/10 border border-accent-yellow/30 px-1 py-0.5 rounded">
                SEC 8-K
              </span>
            )}
            {bearishCats.length > 0 && bullishCats.length === 0 && (
              <span className="text-[9px] font-mono text-accent-red bg-accent-red/10 border border-accent-red/30 px-1 py-0.5 rounded">
                RIESGO
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-display font-bold text-lg text-text-primary">
              ${formatPrice(opp.current_price)}
            </span>
            <span className={clsx('text-xs font-mono', up1d ? 'text-accent-green' : 'text-accent-red')}>
              {up1d ? '+' : ''}{opp.technicals.change_pct_1d.toFixed(1)}% hoy
            </span>
            <span className={clsx('text-xs font-mono hidden sm:inline', up5d ? 'text-accent-green' : 'text-accent-red')}>
              {up5d ? '+' : ''}{opp.technicals.change_pct_5d.toFixed(1)}% 5d
            </span>
          </div>
        </div>

        {/* Composite score ring */}
        <div className={clsx(
          'w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center flex-shrink-0 ml-2',
          ring.border, ring.bg,
        )}>
          <span className={clsx('font-mono font-bold text-sm leading-none', ring.text)}>
            {opp.scores.composite}
          </span>
          <span className="text-[8px] font-mono text-text-muted leading-none mt-0.5">SCORE</span>
        </div>
      </div>

      {/* 3 score bars */}
      <div className="space-y-1.5 mb-3">
        <ScoreBar label="Catalizador" score={opp.scores.catalyst}  color={scoreBarColor(opp.scores.catalyst)}  />
        <ScoreBar label="Técnico"     score={opp.scores.technical} color={scoreBarColor(opp.scores.technical)} />
        <ScoreBar label="Momentum"    score={opp.scores.momentum}  color={scoreBarColor(opp.scores.momentum)}  />
      </div>

      {/* Catalyst badges */}
      {opp.catalysts.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {/* Deduplicate catalyst types */}
          {[...new Map(opp.catalysts.map(c => [c.type, c])).values()].slice(0, 3).map((cat, i) => (
            <CatalystBadge key={i} type={cat.type} />
          ))}
        </div>
      )}

      {/* Top catalyst headline */}
      {opp.catalysts.length > 0 && (
        <p className="text-xs font-mono text-text-secondary line-clamp-2 mb-2 leading-relaxed">
          {opp.catalysts[0].headline}
        </p>
      )}

      {/* Technical signals (if no catalysts) */}
      {opp.catalysts.length === 0 && opp.technicals.signals.length > 0 && (
        <div className="space-y-0.5 mb-2">
          {opp.technicals.signals.slice(0, 2).map((sig, i) => (
            <p key={i} className="text-xs font-mono text-text-secondary flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-accent-green flex-shrink-0" />
              {sig}
            </p>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
          <span className={clsx(
            'px-1 rounded',
            opp.technicals.trend === 'bullish' ? 'text-accent-green bg-accent-green/10' :
            opp.technicals.trend === 'bearish' ? 'text-accent-red bg-accent-red/10' :
            'text-text-muted bg-bg-elevated',
          )}>
            {opp.technicals.trend === 'bullish' ? '↑ ALCISTA' :
             opp.technicals.trend === 'bearish' ? '↓ BAJISTA' : '→ NEUTRAL'}
          </span>
          <span>RSI {opp.technicals.rsi.toFixed(0)}</span>
          {opp.technicals.volume_ratio > 1.5 && (
            <span className="text-accent-yellow">Vol {opp.technicals.volume_ratio.toFixed(1)}x</span>
          )}
        </div>
        <span className="text-[10px] font-mono text-text-muted group-hover:text-accent-cyan transition-colors flex items-center gap-0.5">
          Analizar <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

// ─── Filter bar ────────────────────────────────────────────────────────────────
type FilterKey = 'all' | 'catalyst' | 'technical' | 'momentum';

const FILTERS: { key: FilterKey; label: string; icon: React.ElementType }[] = [
  { key: 'all',       label: 'Todos',        icon: Activity    },
  { key: 'catalyst',  label: 'Catalizador',  icon: Newspaper   },
  { key: 'technical', label: 'Técnico',      icon: BarChart2   },
  { key: 'momentum',  label: 'Momentum',     icon: TrendingUp  },
];

function applyFilter(opps: Opportunity[], filter: FilterKey): Opportunity[] {
  if (filter === 'all') return opps;
  return [...opps].sort((a, b) => b.scores[filter] - a.scores[filter]);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OpportunityScanner() {
  const router = useRouter();
  const [result, setResult]     = useState<ScanResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [filter, setFilter]     = useState<FilterKey>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/opportunity-scan?max=12${force ? `&_t=${Date.now()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      const data: ScanResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = result ? applyFilter(result.opportunities, filter) : [];
  const isLive   = !loading && result != null;

  return (
    <section className="pb-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h2 className="font-mono text-xs text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-accent-purple" />
            Scanner Multi-Señal
            <span className="text-text-muted/60">(catalizadores + técnico + momentum)</span>
          </h2>
          {result && (
            <p className="text-xs font-mono text-text-muted mt-1 flex items-center gap-2 flex-wrap">
              <span>
                {result.candidates_found} candidatos de {result.universe_size} tickers
                en {result.scan_duration_s}s
              </span>
              <span className="text-text-muted/50">·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {new Date(result.scanned_at).toLocaleTimeString('es-ES')}
              </span>
              {result.cache_ttl_min && (
                <>
                  <span className="text-text-muted/50">·</span>
                  <span className="text-text-muted/70">caché {result.cache_ttl_min}min</span>
                </>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-accent-purple transition-colors disabled:opacity-40 flex-shrink-0"
        >
          <RefreshCw className={clsx('w-3 h-3', loading && 'animate-spin')} />
          Re-escanear
        </button>
      </div>

      {/* Filter tabs */}
      {isLive && result!.opportunities.length > 0 && (
        <div className="flex gap-1 bg-bg-card border border-border rounded-lg p-1 mb-4 overflow-x-auto scrollbar-none">
          {FILTERS.map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all flex-shrink-0',
                  filter === f.key
                    ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                    : 'text-text-muted hover:text-text-primary',
                )}
              >
                <Icon className="w-3 h-3" />
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-bg-card border border-border rounded-xl px-4 py-3 text-sm font-mono text-text-muted animate-pulse">
            <Cpu className="w-4 h-4 text-accent-purple animate-spin" />
            <div>
              <p className="text-text-primary font-bold text-xs">Escaneando mercado…</p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Finviz → SEC EDGAR 8-K → Yahoo RSS → análisis técnico (puede tardar ~30-60s)
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-52 rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-2 bg-accent-red/10 border border-accent-red/25 text-accent-red rounded-xl px-4 py-3 text-sm font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-xs">Error en el scanner</p>
            <p className="text-xs text-accent-red/80 mt-0.5">{error}</p>
            <p className="text-xs text-text-muted mt-1">
              El scanner requiere el microservicio Python en Railway activo.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && result && result.opportunities.length === 0 && (
        <div className="text-center py-12 bg-bg-card border border-border rounded-xl">
          <Activity className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted font-mono font-bold">Sin oportunidades destacadas ahora</p>
          <p className="text-xs text-text-muted mt-1">
            {result.universe_size} tickers escaneados · ninguno supera el umbral de calidad
          </p>
        </div>
      )}

      {/* Results grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((opp, i) => (
            <OpportunityCard
              key={opp.ticker}
              opp={opp}
              index={i}
              onClick={() => router.push(`/technical?ticker=${opp.ticker}`)}
            />
          ))}
        </div>
      )}

      {/* Score legend */}
      {isLive && result!.opportunities.length > 0 && (
        <div className="mt-4 bg-bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
            <Info className="w-3 h-3" /> Metodología de scores
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono text-text-muted">
            <div>
              <span className="text-text-secondary font-bold">Catalizador (45%)</span>
              <p className="mt-0.5 leading-relaxed">
                Resultados, FDA, contratos gov., partnerships, upgrades — detectados
                por NLP en SEC EDGAR 8-K (24h) + Yahoo RSS
              </p>
            </div>
            <div>
              <span className="text-text-secondary font-bold">Técnico (30%)</span>
              <p className="mt-0.5 leading-relaxed">
                RSI, MACD, SMA50/200 trend, Bollinger breakout,
                precio vs medias móviles
              </p>
            </div>
            <div>
              <span className="text-text-secondary font-bold">Momentum (25%)</span>
              <p className="mt-0.5 leading-relaxed">
                Variación 1d y 5d del precio + ratio de volumen
                vs media de 20 días
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      {result?.disclaimer && (
        <p className="text-xs text-text-muted font-mono mt-3 opacity-60">
          ⚠ {result.disclaimer}
        </p>
      )}
    </section>
  );
}
