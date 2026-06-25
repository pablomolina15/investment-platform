'use client';

import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend, Scatter,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { MLPrediction } from '@/hooks/useFinanceData';
import type { TechnicalData } from '@/types/finance';
import { formatPrice } from '@/lib/indicators';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  prediction: MLPrediction;
  historicalData?: TechnicalData[];
  historyDays?: number;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const isHistory = payload.some(p => p.name === 'Precio histórico');
  return (
    <div className="bg-bg-card border border-border rounded-xl p-3 shadow-card text-xs font-mono min-w-[160px]">
      <p className="text-text-muted mb-2 font-sans">
        {label ? format(parseISO(label), "d MMM yyyy", { locale: es }) : ''}
      </p>
      {payload.map((p, i) => p.value != null && (
        <div key={i} className="flex items-center justify-between gap-4 mb-1">
          <span style={{ color: p.color }} className="truncate">{p.name}</span>
          <span className="text-text-primary font-bold">${formatPrice(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function MLPredictionChart({ prediction, historicalData, historyDays = 60 }: Props) {
  const { predictions, feature_importance, accuracy_metrics } = prediction;

  // Build combined dataset: last N days history + predictions
  const histSlice = historicalData?.slice(-historyDays) ?? [];

  const histPoints = histSlice.map(d => ({
    date: d.date,
    historical: d.close,
    predicted: undefined as number | undefined,
    upper: undefined as number | undefined,
    lower: undefined as number | undefined,
    confidence: undefined as number | undefined,
    type: 'history',
  }));

  // Bridge: last historical close = first prediction anchor
  const lastHistClose = histSlice[histSlice.length - 1]?.close;

  console.log('DEBUG ML:', {
  lastHistClose,
  histSliceLength: histSlice.length,
  lastPredPrice: predictions[predictions.length - 1]?.predicted_price,
  firstPredPrice: predictions[0]?.predicted_price,
  priceDiff: predictions[predictions.length - 1]?.predicted_price - (lastHistClose ?? 0),
});

  const predPoints = predictions.map((p, i) => ({
    date: p.date,
    historical: i === 0 ? lastHistClose : undefined,
    predicted: p.predicted_price,
    upper: p.upper_bound,
    lower: p.lower_bound,
    confidence: p.confidence,
    type: 'prediction',
  }));

  const chartData = [...histPoints, ...predPoints];

  // Price direction
const lastPred = predictions[predictions.length - 1];
  // Usar el precio de referencia más fiable: último histórico del gráfico,
  // o si no hay datos técnicos, el primer punto predicho como anchor
  const referencePrice = lastHistClose ?? predictions[0]?.predicted_price ?? 0;
  const priceDiff = lastPred && referencePrice
    ? lastPred.predicted_price - referencePrice : 0;
  const pricePct = referencePrice ? (priceDiff / referencePrice) * 100 : 0;
  const bullish = priceDiff >= 0;

  // Feature importance top 6
  const topFeatures = feature_importance
    ? Object.entries(feature_importance)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
    : [];

  const maxFI = topFeatures[0]?.[1] ?? 1;

  // Label cleaner
  const cleanLabel = (key: string) => key
    .replace('_12_26_9', '').replace('_20_2.0', '')
    .replace('_14', '').replace('_50', ' 50').replace('_200', ' 200')
    .replace('_', ' ').toUpperCase();

  const splitIdx = histPoints.length > 0 ? histPoints[histPoints.length - 1].date : '';

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Precio actual',
            value: `$${formatPrice(referencePrice)}`,
            sub: 'Último cierre',
            color: 'text-text-primary',
          },
          {
            label: `Pred. ${prediction.days_ahead}d`,
            value: `$${formatPrice(lastPred?.predicted_price)}`,
            sub: lastPred?.date ?? '',
            color: bullish ? 'text-accent-green' : 'text-accent-red',
          },
          {
            label: 'Cambio esperado',
            value: `${bullish ? '+' : ''}${pricePct.toFixed(2)}%`,
            sub: `${bullish ? '+' : ''}$${formatPrice(Math.abs(priceDiff))}`,
            color: bullish ? 'text-accent-green' : 'text-accent-red',
          },
          {
            label: accuracy_metrics?.direction_acc_pct != null ? 'Dir. Accuracy' : 'MAPE modelo',
            value: accuracy_metrics?.direction_acc_pct != null
              ? `${accuracy_metrics.direction_acc_pct.toFixed(1)}%`
              : accuracy_metrics?.mape != null
              ? `${accuracy_metrics.mape.toFixed(1)}%`
              : 'N/A',
            sub: accuracy_metrics?.direction_acc_pct != null
              ? `Dir. accuracy`
              : `${accuracy_metrics?.train_samples ?? '—'} muestras`,
            color: 'text-accent-yellow',
          },
        ].map(item => (
          <div key={item.label} className="bg-bg-elevated border border-border rounded-xl p-3">
            <p className="text-xs font-mono text-text-muted mb-1">{item.label}</p>
            <p className={`font-display font-bold text-lg leading-none ${item.color}`}>{item.value}</p>
            <p className="text-xs font-mono text-text-muted mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Direction badge */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-mono
        ${bullish
          ? 'bg-accent-green/8 border-accent-green/25 text-accent-green'
          : 'text-accent-red bg-accent-red/8 border-accent-red/25'
        }`}
      >
        {bullish ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span className="font-bold">{bullish ? 'TENDENCIA ALCISTA' : 'TENDENCIA BAJISTA'}</span>
        <span className="text-text-muted ml-1">
          — El modelo {prediction.model.replace('-', ' ')} predice
          {bullish ? ' subida' : ' bajada'} de {Math.abs(pricePct).toFixed(2)}%
          en {prediction.days_ahead} días hábiles
        </span>
      </div>

      {/* Main chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={bullish ? '#00ff88' : '#ff3b6b'} stopOpacity={0.18} />
                <stop offset="95%" stopColor={bullish ? '#00ff88' : '#ff3b6b'} stopOpacity={0.03} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: '#1e1e35' }} tickLine={false}
              tickFormatter={d => { try { return format(parseISO(d), 'dd MMM'); } catch { return d; } }}
              interval={Math.floor(chartData.length / 7)}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false} tickLine={false} width={62}
              tickFormatter={v => `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Confidence band */}
            <Area
              dataKey="upper" stroke="none"
              fill="url(#confBand)" legendType="none"
              connectNulls dot={false}
              name="Banda superior"
            />
            <Area
              dataKey="lower" stroke="none"
              fill="#0a0a0f" legendType="none"
              connectNulls dot={false}
              name="Banda inferior"
            />

            {/* History / prediction split line */}
            {splitIdx && (
              <ReferenceLine
                x={splitIdx}
                stroke="#4a4a6a"
                strokeDasharray="4 3"
                label={{
                  value: 'HOY',
                  fill: '#8888aa',
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  position: 'insideTopRight',
                }}
              />
            )}

            {/* Historical price */}
            <Line
              dataKey="historical"
              stroke="#00d4ff"
              strokeWidth={2}
              dot={false}
              name="Precio histórico"
              connectNulls
              activeDot={{ r: 3, fill: '#00d4ff', strokeWidth: 0 }}
            />

            {/* Predicted price */}
            <Line
              dataKey="predicted"
              stroke={bullish ? '#00ff88' : '#ff3b6b'}
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={false}
              name="Precio predicho"
              connectNulls
              activeDot={{ r: 4, fill: bullish ? '#00ff88' : '#ff3b6b', strokeWidth: 0 }}
            />

            <Legend
              wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-mono)', paddingTop: '8px' }}
              formatter={(v) => <span style={{ color: '#8888aa' }}>{v}</span>}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Confidence over time + Feature importance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Confidence timeline */}
        <div className="bg-bg-elevated border border-border rounded-xl p-4">
          <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">
            Confianza del modelo por día
          </p>
          <div className="space-y-2">
            {predictions.slice(0, 10).map((p, i) => (
              <div key={p.date} className="flex items-center gap-3">
                <span className="text-xs font-mono text-text-muted w-16 flex-shrink-0">
                  {format(parseISO(p.date), 'd MMM', { locale: es })}
                </span>
                <div className="flex-1 h-5 bg-bg-primary rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all duration-700"
                    style={{
                      width: `${p.confidence * 100}%`,
                      background: p.confidence > 0.7
                        ? 'rgba(0,255,136,0.4)'
                        : p.confidence > 0.5
                        ? 'rgba(255,209,102,0.4)'
                        : 'rgba(255,59,107,0.4)',
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-text-secondary w-10 text-right flex-shrink-0">
                  {(p.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature importance */}
        <div className="bg-bg-elevated border border-border rounded-xl p-4">
          <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">
            Features más importantes
          </p>
          {topFeatures.length > 0 ? (
            <div className="space-y-2.5">
              {topFeatures.map(([feat, val], i) => (
                <div key={feat} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-muted w-28 flex-shrink-0 truncate">
                    {cleanLabel(feat)}
                  </span>
                  <div className="flex-1 h-5 bg-bg-primary rounded overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${(val / maxFI) * 100}%`,
                        background: `hsl(${200 - i * 25}, 80%, 55%, 0.5)`,
                        transition: `width 0.8s ease ${i * 80}ms`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-text-secondary w-10 text-right flex-shrink-0">
                    {(val * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted font-mono">No disponible en modo demo</p>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-text-muted font-mono text-center opacity-60">
        ⚠ {prediction.disclaimer}
        {prediction.source === 'demo' && ' · Modo demo activo — conecta el servicio Python para predicciones reales.'}
      </p>
    </div>
  );
}
