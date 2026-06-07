'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import TickerSearch from '@/components/shared/TickerSearch';
import MLPredictionChart from '@/components/ml/MLPredictionChart';
import NewsFeed from '@/components/news/NewsFeed';
import { useTechnical, useMLPrediction } from '@/hooks/useFinanceData';
import { clsx } from 'clsx';
import { Brain, Zap, RefreshCw, AlertTriangle, ChevronRight, Clock, Layers, Cpu, Network } from 'lucide-react';

const MODELS = [
  { id: 'random-forest',     name: 'Random Forest',     icon: Layers,  description: 'Ensemble de 200 árboles. Rápido, robusto, feature importance nativa.',                             tags: ['~5-10s', 'Robusto', 'Interpretable'],     color: 'cyan' },
  { id: 'gradient-boosting', name: 'Gradient Boosting', icon: Zap,     description: 'Boosting iterativo. Mayor precisión que RF con patrones complejos.',                              tags: ['~15s', 'Alta precisión', 'Regularización'], color: 'purple' },
  { id: 'lstm',              name: 'LSTM Neural Net',   icon: Network, description: 'Red neuronal recurrente con Monte Carlo Dropout. Captura dependencias temporales largas.', tags: ['~60-90s', 'Deep Learning', 'MC Dropout CI'],  color: 'green', badge: 'NEW' },
];

const DAY_OPTIONS = [3, 5, 10, 15, 20];

const modelColorMap: Record<string, { active: string; icon: string; tag: string }> = {
  cyan:   { active: 'border-accent-cyan/50 bg-accent-cyan/8',    icon: 'text-accent-cyan bg-accent-cyan/15 border-accent-cyan/30',     tag: 'text-accent-cyan'   },
  purple: { active: 'border-accent-purple/50 bg-accent-purple/8',icon: 'text-accent-purple bg-accent-purple/15 border-accent-purple/30',tag: 'text-accent-purple' },
  green:  { active: 'border-accent-green/50 bg-accent-green/8',  icon: 'text-accent-green bg-accent-green/15 border-accent-green/30',   tag: 'text-accent-green'  },
};

function MLContent() {
  const searchParams = useSearchParams();
  const initTicker = searchParams.get('ticker') ?? 'AAPL';

  const [ticker, setTicker]   = useState(initTicker);
  const [input, setInput]     = useState(initTicker);
  const [model, setModel]     = useState('random-forest');
  const [daysAhead, setDays]  = useState(5);
  const [activeTab, setTab]   = useState<'prediction'|'news'>('prediction');

  const { data: techData, fetch: fetchTech } = useTechnical();
  const { data: mlData, loading, error, fetch: fetchML } = useMLPrediction();

  useEffect(() => { fetchTech(initTicker, '6mo'); }, []); // eslint-disable-line

  async function handleAnalyze(t: string) {
    const upper = t.toUpperCase(); setTicker(upper);
    await Promise.all([fetchTech(upper, '6mo'), fetchML(upper, model, daysAhead)]);
  }

  async function handlePredict() {
    if (!ticker) return;
    await Promise.all([fetchTech(ticker, '6mo'), fetchML(ticker, model, daysAhead)]);
  }

  const selectedModel = MODELS.find(m => m.id === model)!;
  const colors = modelColorMap[selectedModel.color];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12">
      <div className="mb-6 animate-slide-up opacity-0" style={{ animationFillMode:'forwards' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center">
            <Brain className="w-4 h-4 text-accent-purple" />
          </div>
          <span className="text-xs font-mono text-accent-purple uppercase tracking-widest">Machine Learning</span>
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl mb-1">
          Predicción <span className="text-accent-purple">IA</span>
        </h1>
        <p className="text-text-secondary text-sm">Random Forest · Gradient Boosting · LSTM con Monte Carlo Dropout</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <TickerSearch value={input} onChange={setInput} onSubmit={handleAnalyze} placeholder="Ticker…" />
        <div className="flex items-center gap-1 bg-bg-card border border-border rounded-lg p-1">
          <Clock className="w-3.5 h-3.5 text-text-muted ml-2 flex-shrink-0" />
          <span className="text-xs font-mono text-text-muted mr-1 flex-shrink-0">Días:</span>
          {DAY_OPTIONS.map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={clsx('flex-1 py-1.5 rounded-md text-xs font-mono transition-all',
                daysAhead === d ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40' : 'text-text-muted hover:text-text-primary')}>
              {d}d
            </button>
          ))}
        </div>
        <button onClick={handlePredict} disabled={loading || !ticker}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-accent-purple text-white font-mono font-bold rounded-lg hover:bg-accent-purple/90 transition-all disabled:opacity-40 text-sm">
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Entrenando…</> : <><Cpu className="w-4 h-4" /> Ejecutar predicción</>}
        </button>
      </div>

      {/* Model selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {MODELS.map(m => {
          const Icon = m.icon; const active = model === m.id; const c = modelColorMap[m.color];
          return (
            <button key={m.id} onClick={() => setModel(m.id)}
              className={clsx('relative text-left rounded-xl border p-4 transition-all duration-200',
                active ? c.active : 'border-border bg-bg-card hover:border-border-bright')}>
              {active && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-accent-green animate-pulse" />}
              {'badge' in m && m.badge && (
                <span className="absolute top-3 right-7 text-xs font-mono font-bold text-accent-green bg-accent-green/15 border border-accent-green/30 px-1.5 py-0.5 rounded">{m.badge}</span>
              )}
              <div className="flex items-start gap-3">
                <div className={clsx('w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0', c.icon)}><Icon className="w-4 h-4" /></div>
                <div>
                  <p className="font-mono font-bold text-sm text-text-primary mb-1">{m.name}</p>
                  <p className="text-xs text-text-muted leading-relaxed mb-2">{m.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.tags.map(tag => (
                      <span key={tag} className={clsx('text-xs font-mono px-1.5 py-0.5 rounded bg-bg-elevated border border-border', active ? c.tag : 'text-text-muted')}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pipeline strip */}
      <div className="bg-bg-card border border-border rounded-xl p-3 mb-5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-text-secondary">
          {['3 años OHLCV',
            model === 'lstm' ? 'LSTM(128→64→32)' : model === 'gradient-boosting' ? '150 estimadores' : '200 árboles',
            model === 'lstm' ? 'Monte Carlo Dropout (×50)' : 'TimeSeriesSplit CV',
            model === 'lstm' ? 'Intervalos 90% CI' : 'Feature importance',
            `Predicción ${daysAhead}d`,
          ].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-1.5">
              <span className="bg-bg-elevated border border-border px-2 py-1 rounded">{step}</span>
              {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-text-muted flex-shrink-0" />}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-accent-red/10 border border-accent-red/30 rounded-xl px-4 py-3 mb-5 text-sm font-mono text-accent-red">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5">Error en la predicción</p>
            <p className="text-accent-red/80 text-xs">{error}</p>
            {model === 'lstm' && <p className="text-xs text-text-muted mt-1">💡 El modelo LSTM requiere el microservicio Python con TensorFlow instalado.</p>}
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-bg-card border border-border rounded-2xl p-8 text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-accent-purple/20 border border-accent-purple/40 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-accent-purple animate-pulse" />
          </div>
          <p className="font-display font-bold text-lg text-text-primary mb-1">Entrenando {selectedModel.name}…</p>
          <p className="text-sm text-text-muted font-mono">
            {model === 'lstm' ? 'Construyendo secuencias → Entrenando red LSTM → Monte Carlo Dropout…' : `Descargando 3 años → Calculando features → Entrenando ${model === 'random-forest' ? '200 árboles' : '150 estimadores'}…`}
          </p>
          {model === 'lstm' && <p className="text-xs text-text-muted font-mono mt-2 opacity-60">El primer entrenamiento LSTM puede tardar 60-90 segundos</p>}
        </div>
      )}

      {!mlData && !loading && !error && (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-10 h-10 text-accent-purple opacity-60" />
          </div>
          <p className="font-display text-xl text-text-secondary mb-2">Configura y ejecuta la predicción</p>
          <p className="text-sm text-text-muted font-mono max-w-md mx-auto">Selecciona ticker, modelo y horizonte temporal.</p>
        </div>
      )}

      {mlData && !loading && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-bg-card border border-border rounded-lg p-1 w-fit">
            {[{id:'prediction' as const, label:'📈 Predicción'},{id:'news' as const, label:'📰 Noticias'}].map(tab => (
              <button key={tab.id} onClick={() => setTab(tab.id)}
                className={clsx('px-4 py-1.5 rounded-md text-xs font-mono transition-all',
                  activeTab === tab.id ? 'bg-bg-elevated text-text-primary border border-border' : 'text-text-muted hover:text-text-secondary')}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'prediction' && (
            <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-7 animate-fade-in opacity-0" style={{ animationFillMode:'forwards' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-display font-bold text-xl text-text-primary">{mlData.ticker}</span>
                    <span className={clsx('font-mono text-xs px-2 py-0.5 rounded border', colors.tag,
                      model === 'lstm' ? 'bg-accent-green/10 border-accent-green/25' : model === 'gradient-boosting' ? 'bg-accent-purple/10 border-accent-purple/25' : 'bg-accent-cyan/10 border-accent-cyan/25')}>
                      {mlData.model.replace(/-/g,' ').toUpperCase()}
                    </span>
                    {mlData.source === 'demo' && <span className="text-xs font-mono bg-accent-yellow/10 border border-accent-yellow/30 text-accent-yellow px-2 py-0.5 rounded-full">DEMO</span>}
                  </div>
                  <p className="text-xs text-text-muted font-mono">{mlData.days_ahead} días hábiles · {new Date(mlData.last_updated).toLocaleString('es-ES')}</p>
                </div>
                <button onClick={handlePredict} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-text-muted border border-border rounded-lg hover:text-text-primary hover:border-border-bright transition-all">
                  <RefreshCw className="w-3 h-3" /> Recalcular
                </button>
              </div>
              <MLPredictionChart prediction={mlData} historicalData={techData?.data} historyDays={60} />
            </div>
          )}

          {activeTab === 'news' && (
            <div className="bg-bg-card border border-border rounded-2xl p-5 sm:p-7 animate-fade-in opacity-0" style={{ animationFillMode:'forwards' }}>
              <NewsFeed ticker={mlData.ticker} maxItems={8} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function MLPage() {
  return (
    <div className="min-h-screen bg-bg-primary bg-grid">
      <Navbar />
      <Suspense fallback={
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12">
          <div className="space-y-3 animate-pulse mt-8">
            <div className="skeleton h-10 w-48 rounded-xl" />
            <div className="skeleton h-12 rounded-xl" />
            <div className="grid grid-cols-3 gap-3"><div className="skeleton h-32 rounded-xl" /><div className="skeleton h-32 rounded-xl" /><div className="skeleton h-32 rounded-xl" /></div>
            <div className="skeleton h-80 rounded-xl" />
          </div>
        </main>
      }>
        <MLContent />
      </Suspense>
    </div>
  );
}
