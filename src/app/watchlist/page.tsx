'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import { useAuth } from '@/components/auth/AuthProvider';
import AuthModal from '@/components/auth/AuthModal';
import {
  getPortfolioTrades, addPortfolioTrade, updatePortfolioTrade,
  deletePortfolioTrade, type PortfolioTrade, type NewTrade,
} from '@/lib/supabase';
import { formatPrice } from '@/lib/indicators';
import { clsx } from 'clsx';
import {
  TrendingUp, TrendingDown, Plus, Trash2, Brain, RefreshCw,
  ChevronDown, ChevronUp, X, CheckCircle, Clock, BarChart2,
  DollarSign, Percent, LogIn, Loader2, Check, Target,
  Trophy, AlertTriangle, Minus,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtUSD(v: number | null | undefined, decimals = 2) {
  if (v == null) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
function fmtPct(v: number | null | undefined) {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}
function isTargetReached(targetDate: string | null): boolean {
  if (!targetDate) return false;
  return new Date(targetDate) <= new Date();
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface TradeWithMetrics extends PortfolioTrade {
  current_price?: number;
  unrealized_pnl?: number;
  unrealized_pct?: number;
  realized_pnl?: number;
  realized_pct?: number;
  // Backtesting
  actual_price_at_target?: number;   // real price when target date arrived
  ml_error_pct?: number;             // (actual - predicted) / predicted * 100
  ml_direction_correct?: boolean;    // did model predict right direction?
}

// ── ML prediction fetcher ─────────────────────────────────────────────────────
async function fetchMLPrediction(ticker: string, model: string, daysAhead: number) {
  const res = await fetch('/api/ml-predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, model, days_ahead: daysAhead }),
  });
  if (!res.ok) throw new Error(`ML error ${res.status}`);
  const data = await res.json();
  const lastPred = data.predictions?.[data.predictions.length - 1];
  return {
    pred_price:  lastPred?.predicted_price ?? null,
    pred_pct:    null as number | null,
    target_date: lastPred?.date ?? null,
  };
}

// ── Price at date fetcher (for backtesting) ───────────────────────────────────
async function fetchPriceAtDate(ticker: string, date: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/price-at-date?ticker=${ticker}&date=${date}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.price ?? null;
  } catch {
    return null;
  }
}

// ── Backtesting stats calculator ──────────────────────────────────────────────
interface BacktestStats {
  total:          number;
  correct_dir:    number;
  dir_accuracy:   number;
  avg_error_pct:  number;
  by_model: Record<string, { total: number; correct: number; avg_error: number }>;
}

function computeBacktestStats(trades: TradeWithMetrics[]): BacktestStats {
  const evaluated = trades.filter(
    t => t.ml_pred_price != null &&
         t.actual_price_at_target != null &&
         t.ml_direction_correct != null
  );

  if (evaluated.length === 0) {
    return { total: 0, correct_dir: 0, dir_accuracy: 0, avg_error_pct: 0, by_model: {} };
  }

  const correct   = evaluated.filter(t => t.ml_direction_correct).length;
  const errors    = evaluated.map(t => Math.abs(t.ml_error_pct ?? 0));
  const avg_error = errors.reduce((s, e) => s + e, 0) / errors.length;

  const by_model: Record<string, { total: number; correct: number; avg_error: number }> = {};
  for (const t of evaluated) {
    const m = t.ml_model ?? 'unknown';
    if (!by_model[m]) by_model[m] = { total: 0, correct: 0, avg_error: 0 };
    by_model[m].total++;
    if (t.ml_direction_correct) by_model[m].correct++;
    by_model[m].avg_error += Math.abs(t.ml_error_pct ?? 0);
  }
  for (const m of Object.keys(by_model)) {
    by_model[m].avg_error = by_model[m].avg_error / by_model[m].total;
  }

  return {
    total:        evaluated.length,
    correct_dir:  correct,
    dir_accuracy: (correct / evaluated.length) * 100,
    avg_error_pct: avg_error,
    by_model,
  };
}

// ── Backtesting Panel ─────────────────────────────────────────────────────────
function BacktestingPanel({ trades }: { trades: TradeWithMetrics[] }) {
  const stats = computeBacktestStats(trades);

  const pending = trades.filter(
    t => t.ml_pred_price != null &&
         t.ml_target_date != null &&
         !isTargetReached(t.ml_target_date) &&
         t.actual_price_at_target == null
  ).length;

  const ready = trades.filter(
    t => t.ml_pred_price != null &&
         isTargetReached(t.ml_target_date) &&
         t.actual_price_at_target == null
  ).length;

  if (stats.total === 0 && pending === 0 && ready === 0) return null;

  const dirColor = stats.dir_accuracy >= 60
    ? 'text-accent-green' : stats.dir_accuracy >= 50
    ? 'text-accent-yellow' : 'text-accent-red';

  return (
    <div className="bg-bg-card border border-accent-purple/25 rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-accent-purple" />
        <h2 className="font-mono font-bold text-sm text-text-primary uppercase tracking-wider">
          Backtesting ML
        </h2>
        {ready > 0 && (
          <span className="text-xs font-mono bg-accent-yellow/15 border border-accent-yellow/30 text-accent-yellow px-2 py-0.5 rounded-full animate-pulse">
            {ready} predicción{ready > 1 ? 'es' : ''} lista{ready > 1 ? 's' : ''} para evaluar
          </span>
        )}
      </div>

      {stats.total === 0 ? (
        <p className="text-xs font-mono text-text-muted">
          {pending > 0
            ? `${pending} predicción${pending > 1 ? 'es' : ''} pendiente${pending > 1 ? 's' : ''} — aparecerán aquí cuando llegue la fecha objetivo.`
            : 'Añade operaciones con predicción ML para ver el backtesting.'}
        </p>
      ) : (
        <div className="space-y-4">
          {/* Global stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bg-elevated rounded-xl p-3 text-center">
              <p className="text-xs font-mono text-text-muted mb-1">Evaluadas</p>
              <p className="font-display font-bold text-xl text-text-primary">{stats.total}</p>
            </div>
            <div className="bg-bg-elevated rounded-xl p-3 text-center">
              <p className="text-xs font-mono text-text-muted mb-1">Dir. Accuracy</p>
              <p className={clsx('font-display font-bold text-xl', dirColor)}>
                {stats.dir_accuracy.toFixed(1)}%
              </p>
              <p className="text-[10px] font-mono text-text-muted">{stats.correct_dir}/{stats.total} correctas</p>
            </div>
            <div className="bg-bg-elevated rounded-xl p-3 text-center">
              <p className="text-xs font-mono text-text-muted mb-1">Error medio</p>
              <p className="font-display font-bold text-xl text-accent-yellow">
                {stats.avg_error_pct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* By model */}
          {Object.keys(stats.by_model).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-mono text-text-muted uppercase tracking-wider">Por modelo</p>
              {Object.entries(stats.by_model).map(([model, s]) => {
                const acc     = (s.correct / s.total) * 100;
                const accCol  = acc >= 60 ? 'text-accent-green' : acc >= 50 ? 'text-accent-yellow' : 'text-accent-red';
                const label   = model === 'random-forest' ? 'Random Forest'
                              : model === 'gradient-boosting' ? 'Gradient Boosting'
                              : 'LSTM';
                return (
                  <div key={model} className="flex items-center gap-3 bg-bg-elevated rounded-lg px-3 py-2">
                    <Brain className="w-3.5 h-3.5 text-accent-purple flex-shrink-0" />
                    <span className="text-xs font-mono text-text-secondary flex-1">{label}</span>
                    <span className="text-xs font-mono text-text-muted">{s.total} pred.</span>
                    <span className={clsx('text-xs font-mono font-bold', accCol)}>
                      {acc.toFixed(0)}% dir.
                    </span>
                    <span className="text-xs font-mono text-accent-yellow">
                      ±{s.avg_error.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Interpretation */}
          <p className="text-[10px] font-mono text-text-muted opacity-70">
            Dir. Accuracy: % de veces que el modelo acertó la dirección (sube/baja) del precio.
            &gt;60% = bueno · 50-60% = aceptable · &lt;50% = peor que azar.
            Error medio: desviación del precio predicho vs real.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Add Trade Modal ───────────────────────────────────────────────────────────
interface FormState {
  ticker: string; broker: string; notes: string;
  buy_date: string; buy_shares: string; buy_price: string; buy_total: string;
  sell_date: string; sell_price: string; sell_total: string;
  ml_model: string; ml_days_ahead: string;
  ml_pred_price: string; ml_pred_pct: string; ml_target_date: string;
}

const EMPTY_FORM: FormState = {
  ticker: '', broker: 'IBKR', notes: '',
  buy_date: new Date().toISOString().split('T')[0],
  buy_shares: '', buy_price: '', buy_total: '',
  sell_date: '', sell_price: '', sell_total: '',
  ml_model: 'random-forest', ml_days_ahead: '5',
  ml_pred_price: '', ml_pred_pct: '', ml_target_date: '',
};

function AddTradeModal({ onClose, onSave }: { onClose: () => void; onSave: (t: NewTrade) => void }) {
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [loadingML, setLoadingML] = useState(false);
  const [mlError, setMLError]   = useState('');
  const [isSell, setIsSell]     = useState(false);

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  async function fetchML() {
    if (!form.ticker) return;
    setLoadingML(true); setMLError('');
    try {
      const { pred_price, target_date } = await fetchMLPrediction(
        form.ticker, form.ml_model, Number(form.ml_days_ahead));
      const buyPrice = parseFloat(form.buy_price.replace(',','.')) || pred_price || 0;
      const predPct  = pred_price && buyPrice ? ((pred_price - buyPrice) / buyPrice) * 100 : null;
      setForm(f => ({
        ...f,
        ml_pred_price:  pred_price?.toFixed(2) ?? '',
        ml_pred_pct:    predPct?.toFixed(2) ?? '',
        ml_target_date: target_date ?? '',
      }));
    } catch {
      setMLError('No se pudo obtener predicción ML');
    } finally {
      setLoadingML(false);
    }
  }

  function handleSave() {
    const norm = (s: string) => parseFloat(s.replace(',', '.'));
    if (!form.ticker || !form.buy_date || !form.buy_shares || !form.buy_price || !form.buy_total) {
      alert('Rellena los campos obligatorios: Ticker, Fecha, Nº acciones, Precio/acción y Total');
      return;
    }
    const buyPrice    = norm(form.buy_price);
    const mlPredPrice = form.ml_pred_price ? norm(form.ml_pred_price) : null;
    const trade: NewTrade = {
      ticker:         form.ticker.toUpperCase(),
      broker:         form.broker,
      notes:          form.notes || null,
      buy_date:       form.buy_date,
      buy_shares:     norm(form.buy_shares),
      buy_price:      buyPrice,
      buy_total:      norm(form.buy_total),
      sell_date:      isSell && form.sell_date  ? form.sell_date  : null,
      sell_price:     isSell && form.sell_price ? norm(form.sell_price) : null,
      sell_total:     isSell && form.sell_total ? norm(form.sell_total) : null,
      ml_model:       form.ml_model || null,
      ml_days_ahead:  parseInt(form.ml_days_ahead) || null,
      ml_target_date: form.ml_target_date || null,
      ml_pred_price:  mlPredPrice,
      ml_pred_pct:    mlPredPrice && buyPrice
        ? ((mlPredPrice - buyPrice) / buyPrice) * 100
        : form.ml_pred_pct ? norm(form.ml_pred_pct) : null,
    };
    onSave(trade);
  }

  const inputCls = 'w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-purple/60';
  const labelCls = 'text-xs font-mono text-text-muted mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-mono font-bold text-text-primary flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent-purple" /> Nueva operación
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Ticker *</label>
              <input className={inputCls} value={form.ticker} onChange={set('ticker')}
                placeholder="AAPL" onBlur={() => setForm(f => ({ ...f, ticker: f.ticker.toUpperCase() }))} />
            </div>
            <div>
              <label className={labelCls}>Broker</label>
              <select className={inputCls} value={form.broker} onChange={set('broker')}>
                <option>IBKR</option><option>Degiro</option><option>Schwab</option><option>Otro</option>
              </select>
            </div>
          </div>

          <div className="bg-bg-elevated rounded-xl p-3 space-y-3">
            <p className="text-xs font-mono text-accent-cyan font-bold uppercase tracking-wider">Compra</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Fecha *</label>
                <input type="date" className={inputCls} value={form.buy_date} onChange={set('buy_date')} /></div>
              <div><label className={labelCls}>Nº acciones *</label>
                <input type="number" className={inputCls} value={form.buy_shares} onChange={set('buy_shares')} placeholder="10" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Precio/acción *</label>
                <input type="number" className={inputCls} value={form.buy_price} onChange={set('buy_price')} placeholder="150.00" step="0.01" /></div>
              <div><label className={labelCls}>Total con comisiones *</label>
                <input type="number" className={inputCls} value={form.buy_total} onChange={set('buy_total')} placeholder="1502.00" step="0.01" /></div>
            </div>
          </div>

          <button onClick={() => setIsSell(v => !v)}
            className="flex items-center gap-2 text-xs font-mono text-text-muted hover:text-text-primary transition-colors">
            {isSell ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {isSell ? 'Ocultar venta' : 'Añadir venta (posición cerrada)'}
          </button>

          {isSell && (
            <div className="bg-bg-elevated rounded-xl p-3 space-y-3">
              <p className="text-xs font-mono text-accent-green font-bold uppercase tracking-wider">Venta</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Fecha</label>
                  <input type="date" className={inputCls} value={form.sell_date} onChange={set('sell_date')} /></div>
                <div><label className={labelCls}>Precio/acción</label>
                  <input type="number" className={inputCls} value={form.sell_price} onChange={set('sell_price')} placeholder="170.00" step="0.01" /></div>
              </div>
              <div><label className={labelCls}>Total con comisiones</label>
                <input type="number" className={inputCls} value={form.sell_total} onChange={set('sell_total')} placeholder="1698.00" step="0.01" /></div>
            </div>
          )}

          <div className="bg-bg-elevated rounded-xl p-3 space-y-3">
            <p className="text-xs font-mono text-accent-purple font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" /> Predicción ML
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Modelo</label>
                <select className={inputCls} value={form.ml_model} onChange={set('ml_model')}>
                  <option value="random-forest">Random Forest</option>
                  <option value="gradient-boosting">Gradient Boosting</option>
                  <option value="lstm">LSTM</option>
                </select></div>
              <div><label className={labelCls}>Horizonte (días hábiles)</label>
                <select className={inputCls} value={form.ml_days_ahead} onChange={set('ml_days_ahead')}>
                  {[1,3,5,10].map(d => <option key={d} value={d}>{d}d</option>)}
                </select></div>
            </div>
            <button onClick={fetchML} disabled={!form.ticker || loadingML}
              className="flex items-center gap-2 px-3 py-1.5 bg-accent-purple/20 border border-accent-purple/40 text-accent-purple text-xs font-mono rounded-lg hover:bg-accent-purple/30 transition-all disabled:opacity-40">
              {loadingML ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
              {loadingML ? 'Calculando…' : 'Obtener predicción automática'}
            </button>
            {mlError && <p className="text-xs text-accent-red font-mono">{mlError}</p>}
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelCls}>Precio objetivo ML</label>
                <input type="number" className={inputCls} value={form.ml_pred_price} onChange={set('ml_pred_price')} placeholder="auto" step="0.01" /></div>
              <div><label className={labelCls}>% vs compra (est.)</label>
                <input type="number" className={inputCls} value={form.ml_pred_pct} onChange={set('ml_pred_pct')} placeholder="auto" step="0.01" /></div>
              <div><label className={labelCls}>Fecha objetivo</label>
                <input type="date" className={inputCls} value={form.ml_target_date} onChange={set('ml_target_date')} /></div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Notas</label>
            <textarea className={clsx(inputCls, 'resize-none h-16')} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Motivo de la operación…" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2 text-sm font-mono text-text-muted border border-border rounded-lg hover:border-border-bright transition-all">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-2 text-sm font-mono font-bold bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90 transition-all">Guardar operación</button>
        </div>
      </div>
    </div>
  );
}

// ── Trade Row ─────────────────────────────────────────────────────────────────
function TradeRow({ trade, onDelete, onClose }: {
  trade: TradeWithMetrics;
  onDelete: (id: string) => void;
  onClose: (id: string, sellPrice: number, sellTotal: number, sellDate: string) => void;
}) {
  const isOpen    = !trade.sell_date;
  const targetHit = isTargetReached(trade.ml_target_date);
  const [closing, setClosing] = useState(false);
  const [sellP, setSellP]     = useState('');
  const [sellT, setSellT]     = useState('');
  const [sellD, setSellD]     = useState(new Date().toISOString().split('T')[0]);

  const pnl    = isOpen ? trade.unrealized_pnl : trade.realized_pnl;
  const pnlPct = isOpen ? trade.unrealized_pct : trade.realized_pct;
  const pnlUp  = (pnl ?? 0) >= 0;

  // ML backtesting display
  const hasBacktest  = trade.actual_price_at_target != null && trade.ml_pred_price != null;
  const mlErrPct     = trade.ml_error_pct;
  const mlDirCorrect = trade.ml_direction_correct;

  return (
    <div className={clsx(
      'bg-bg-card border rounded-xl p-4 space-y-3 transition-all',
      isOpen ? 'border-accent-cyan/25' : 'border-border',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-base text-text-primary">{trade.ticker}</span>
          <span className={clsx('text-xs font-mono px-1.5 py-0.5 rounded border',
            isOpen ? 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30'
                   : 'text-text-muted bg-bg-elevated border-border')}>
            {isOpen ? '● ABIERTA' : '✓ CERRADA'}
          </span>
          <span className="text-xs font-mono text-text-muted">{trade.broker}</span>
          {trade.ml_model && (
            <span className="text-xs font-mono text-accent-purple bg-accent-purple/10 border border-accent-purple/25 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Brain className="w-2.5 h-2.5" />
              {trade.ml_model.replace('-',' ').toUpperCase()} {trade.ml_days_ahead}d
            </span>
          )}
        </div>
        <button onClick={() => onDelete(trade.id)} className="text-text-muted hover:text-accent-red transition-colors flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="bg-bg-elevated rounded-lg p-2">
          <p className="text-text-muted mb-0.5">Compra</p>
          <p className="text-text-primary font-bold">{fmtUSD(trade.buy_price)}/acc</p>
          <p className="text-text-muted">{trade.buy_date}</p>
          <p className="text-text-muted">{trade.buy_shares} acc · {fmtUSD(trade.buy_total)}</p>
        </div>

        {isOpen ? (
          <div className="bg-bg-elevated rounded-lg p-2">
            <p className="text-text-muted mb-0.5">Precio actual</p>
            <p className="text-text-primary font-bold">{trade.current_price ? fmtUSD(trade.current_price) : '…'}</p>
            <p className={clsx('font-bold', pnlUp ? 'text-accent-green' : 'text-accent-red')}>{fmtPct(pnlPct)}</p>
          </div>
        ) : (
          <div className="bg-bg-elevated rounded-lg p-2">
            <p className="text-text-muted mb-0.5">Venta</p>
            <p className="text-text-primary font-bold">{fmtUSD(trade.sell_price)}/acc</p>
            <p className="text-text-muted">{trade.sell_date}</p>
            <p className="text-text-muted">{fmtUSD(trade.sell_total)}</p>
          </div>
        )}

        <div className={clsx('rounded-lg p-2', pnlUp ? 'bg-accent-green/8' : 'bg-accent-red/8')}>
          <p className="text-text-muted mb-0.5">{isOpen ? 'P&L latente' : 'P&L neto'}</p>
          <p className={clsx('font-bold', pnlUp ? 'text-accent-green' : 'text-accent-red')}>
            {pnl != null ? `${pnlUp ? '+' : ''}${fmtUSD(pnl)}` : '—'}
          </p>
          <p className={clsx('font-bold', pnlUp ? 'text-accent-green' : 'text-accent-red')}>{fmtPct(pnlPct)}</p>
        </div>

        {/* ML cell — shows prediction or backtesting result */}
        {trade.ml_pred_price ? (
          <div className={clsx('rounded-lg p-2 border', hasBacktest
            ? mlDirCorrect ? 'bg-accent-green/8 border-accent-green/25' : 'bg-accent-red/8 border-accent-red/25'
            : targetHit ? 'bg-accent-yellow/8 border-accent-yellow/25' : 'bg-accent-purple/8 border-accent-purple/25')}>
            <p className="text-text-muted mb-0.5 flex items-center gap-1">
              {hasBacktest
                ? mlDirCorrect ? <><Trophy className="w-2.5 h-2.5 text-accent-green" /> Acierto</>
                               : <><AlertTriangle className="w-2.5 h-2.5 text-accent-red" /> Fallo</>
                : targetHit ? <><Clock className="w-2.5 h-2.5 text-accent-yellow" /> Evaluando…</>
                            : <><Brain className="w-2.5 h-2.5" /> ML · {trade.ml_target_date}</>}
            </p>

            {hasBacktest ? (
              <>
                <p className="text-text-secondary">Pred: {fmtUSD(trade.ml_pred_price)}</p>
                <p className="text-text-primary font-bold">Real: {fmtUSD(trade.actual_price_at_target)}</p>
                <p className={clsx('font-bold', (mlErrPct ?? 0) < 0 ? 'text-accent-red' : 'text-accent-green')}>
                  Error: {mlErrPct != null ? `${mlErrPct > 0 ? '+' : ''}${mlErrPct.toFixed(1)}%` : '—'}
                </p>
              </>
            ) : (
              <>
                <p className="text-accent-purple font-bold">{fmtUSD(trade.ml_pred_price)}</p>
                <p className="text-accent-purple">{fmtPct(trade.ml_pred_pct)}</p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-bg-elevated rounded-lg p-2">
            <p className="text-text-muted text-[10px]">Sin predicción ML</p>
          </div>
        )}
      </div>

      {trade.notes && (
        <p className="text-xs font-mono text-text-muted border-l-2 border-border pl-2">{trade.notes}</p>
      )}

      {isOpen && !closing && (
        <button onClick={() => setClosing(true)}
          className="flex items-center gap-1.5 text-xs font-mono text-accent-green hover:text-accent-green/80 transition-colors">
          <CheckCircle className="w-3.5 h-3.5" /> Cerrar posición
        </button>
      )}

      {isOpen && closing && (
        <div className="bg-bg-elevated rounded-xl p-3 space-y-2">
          <p className="text-xs font-mono text-accent-green font-bold">Cerrar posición</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-mono text-text-muted block mb-1">Fecha venta</label>
              <input type="date" value={sellD} onChange={e => setSellD(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-green/60" />
            </div>
            <div>
              <label className="text-xs font-mono text-text-muted block mb-1">Precio/acc</label>
              <input type="number" value={sellP} onChange={e => setSellP(e.target.value)} placeholder="170.00"
                className="w-full bg-bg-primary border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-green/60" />
            </div>
            <div>
              <label className="text-xs font-mono text-text-muted block mb-1">Total con com.</label>
              <input type="number" value={sellT} onChange={e => setSellT(e.target.value)} placeholder="1698.00"
                className="w-full bg-bg-primary border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-green/60" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setClosing(false)} className="text-xs font-mono text-text-muted hover:text-text-primary transition-colors">Cancelar</button>
            <button
              onClick={() => { if (sellP && sellT) { onClose(trade.id, parseFloat(sellP), parseFloat(sellT), sellD); setClosing(false); } }}
              className="flex items-center gap-1 px-3 py-1 bg-accent-green/20 border border-accent-green/40 text-accent-green text-xs font-mono rounded-lg hover:bg-accent-green/30 transition-all">
              <Check className="w-3 h-3" /> Confirmar venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { user }  = useAuth();
  const [trades, setTrades]     = useState<TradeWithMetrics[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [filter, setFilter]     = useState<'all' | 'open' | 'closed'>('all');

  const loadTrades = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const raw = await getPortfolioTrades(user.id);

    const enriched = await Promise.all(raw.map(async (t): Promise<TradeWithMetrics> => {
      // Current price
      let current_price: number | undefined;
      try {
        const res  = await fetch(`/api/prices?ticker=${t.ticker}&period=5d`);
        const data = await res.json();
        const last = data.data?.[data.data.length - 1];
        current_price = last?.close;
      } catch { /* ok */ }

      const isOpen        = !t.sell_date;
      const realized_pnl  = !isOpen && t.sell_total ? t.sell_total - t.buy_total : undefined;
      const realized_pct  = realized_pnl != null ? (realized_pnl / t.buy_total) * 100 : undefined;
      const unrealized_pnl = isOpen && current_price ? (current_price - t.buy_price) * t.buy_shares : undefined;
      const unrealized_pct = unrealized_pnl != null ? (unrealized_pnl / t.buy_total) * 100 : undefined;

      // ── Backtesting: fetch actual price at ML target date ────────────────
      let actual_price_at_target: number | undefined;
      let ml_error_pct: number | undefined;
      let ml_direction_correct: boolean | undefined;

      if (t.ml_pred_price != null && t.ml_target_date && isTargetReached(t.ml_target_date)) {
        const actualPrice = await fetchPriceAtDate(t.ticker, t.ml_target_date);
        if (actualPrice != null) {
          actual_price_at_target = actualPrice;
          // Error %: (actual - predicted) / predicted * 100
          ml_error_pct = ((actualPrice - t.ml_pred_price) / t.ml_pred_price) * 100;
          // Direction: did price move the way the model predicted?
          const predictedDir = t.ml_pred_price > t.buy_price ? 1 : t.ml_pred_price < t.buy_price ? -1 : 0;
          const actualDir    = actualPrice > t.buy_price     ? 1 : actualPrice < t.buy_price     ? -1 : 0;
          ml_direction_correct = predictedDir !== 0 && predictedDir === actualDir;
        }
      }

      return {
        ...t,
        current_price,
        realized_pnl, realized_pct,
        unrealized_pnl, unrealized_pct,
        actual_price_at_target,
        ml_error_pct:       ml_error_pct != null ? Math.round(ml_error_pct * 100) / 100 : undefined,
        ml_direction_correct,
      };
    }));

    setTrades(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  async function handleAdd(trade: NewTrade) {
    if (!user) return;
    const saved = await addPortfolioTrade(user.id, trade);
    if (saved) { setShowAdd(false); loadTrades(); }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta operación?')) return;
    await deletePortfolioTrade(id);
    setTrades(prev => prev.filter(t => t.id !== id));
  }

  async function handleClose(id: string, sellPrice: number, sellTotal: number, sellDate: string) {
    await updatePortfolioTrade(id, { sell_price: sellPrice, sell_total: sellTotal, sell_date: sellDate });
    loadTrades();
  }

  const openTrades      = trades.filter(t => !t.sell_date);
  const closedTrades    = trades.filter(t => !!t.sell_date);
  const totalRealized   = closedTrades.reduce((s, t) => s + (t.realized_pnl ?? 0), 0);
  const totalUnrealized = openTrades.reduce((s, t) => s + (t.unrealized_pnl ?? 0), 0);
  const filtered        = filter === 'open' ? openTrades : filter === 'closed' ? closedTrades : trades;

  return (
    <div className="min-h-screen bg-bg-primary bg-grid">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-12">

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent-green/20 border border-accent-green/40 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-accent-green" />
            </div>
            <span className="text-xs font-mono text-accent-green uppercase tracking-widest">Portfolio</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-3xl sm:text-4xl mb-1">
                Mis <span className="text-accent-green">Operaciones</span>
              </h1>
              <p className="text-text-secondary text-sm">IBKR · Seguimiento real + backtesting ML</p>
            </div>
            {user && (
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent-green text-bg-primary font-mono font-bold text-sm rounded-lg hover:bg-accent-green/90 transition-all flex-shrink-0">
                <Plus className="w-4 h-4" /> Nueva
              </button>
            )}
          </div>
        </div>

        {!user && (
          <div className="text-center py-16 bg-bg-card border border-border rounded-2xl">
            <BarChart2 className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-40" />
            <p className="font-display text-xl text-text-secondary mb-2">Inicia sesión para ver tu portfolio</p>
            <p className="text-sm text-text-muted font-mono mb-6">Tus operaciones se sincronizan de forma segura en la nube</p>
            <button onClick={() => setShowAuth(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent-purple text-white font-mono font-bold rounded-lg hover:bg-accent-purple/90 transition-all mx-auto">
              <LogIn className="w-4 h-4" /> Iniciar sesión
            </button>
          </div>
        )}

        {user && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Posiciones abiertas', value: String(openTrades.length),   icon: Clock,        color: 'text-accent-cyan'  },
                { label: 'Operaciones cerradas',value: String(closedTrades.length), icon: CheckCircle,  color: 'text-text-muted'   },
                { label: 'P&L realizado',  value: `${totalRealized  >= 0 ? '+' : ''}${fmtUSD(totalRealized)}`,  icon: DollarSign, color: totalRealized  >= 0 ? 'text-accent-green' : 'text-accent-red' },
                { label: 'P&L latente',    value: `${totalUnrealized >= 0 ? '+' : ''}${fmtUSD(totalUnrealized)}`, icon: Percent,   color: totalUnrealized >= 0 ? 'text-accent-green' : 'text-accent-red' },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="bg-bg-card border border-border rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={clsx('w-3.5 h-3.5', s.color)} />
                      <p className="text-xs font-mono text-text-muted">{s.label}</p>
                    </div>
                    <p className={clsx('font-display font-bold text-lg', s.color)}>{s.value}</p>
                  </div>
                );
              })}
            </div>

            {/* ── Backtesting Panel ── */}
            <BacktestingPanel trades={trades} />

            {/* Filter tabs */}
            <div className="flex gap-1 bg-bg-card border border-border rounded-lg p-1 mb-4 w-fit">
              {(['all', 'open', 'closed'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={clsx('px-4 py-1.5 rounded-md text-xs font-mono transition-all',
                    filter === f ? 'bg-accent-green/20 text-accent-green border border-accent-green/40' : 'text-text-muted hover:text-text-primary')}>
                  {f === 'all' ? 'Todas' : f === 'open' ? `Abiertas (${openTrades.length})` : `Cerradas (${closedTrades.length})`}
                </button>
              ))}
              <button onClick={loadTrades} className="px-2 py-1.5 text-text-muted hover:text-text-primary transition-colors">
                <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
              </button>
            </div>

            {loading && (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="skeleton h-36 rounded-xl" />)}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="text-center py-12 bg-bg-card border border-border rounded-xl">
                <BarChart2 className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-40" />
                <p className="text-sm text-text-muted font-mono">
                  {filter === 'all' ? 'Sin operaciones aún — añade tu primera trade' : `Sin operaciones ${filter === 'open' ? 'abiertas' : 'cerradas'}`}
                </p>
              </div>
            )}

            {!loading && (
              <div className="space-y-3">
                {filtered.map(trade => (
                  <TradeRow key={trade.id} trade={trade} onDelete={handleDelete} onClose={handleClose} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showAdd && <AddTradeModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}