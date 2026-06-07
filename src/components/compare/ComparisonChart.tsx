'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface NormalizedPoint { date: string; return: number }
interface ComparisonSeries { ticker: string; normalized: NormalizedPoint[]; source: string }

interface Props { series: ComparisonSeries[] }

const COLORS = ['#00d4ff', '#00ff88', '#ffd166', '#ff3b6b', '#7b61ff'];

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  return (
    <div className="bg-bg-card border border-border rounded-xl p-3 shadow-card min-w-[160px]">
      <p className="text-xs text-text-muted font-mono mb-2">
        {label ? format(parseISO(label), 'd MMM yyyy', { locale: es }) : ''}
      </p>
      {sorted.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-1">
          <span className="text-xs font-mono font-bold" style={{ color: p.color }}>{p.name}</span>
          <span className={`text-xs font-mono ${p.value >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {p.value >= 0 ? '+' : ''}{p.value.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ComparisonChart({ series }: Props) {
  // Merge all dates
  const dateSet = new Set<string>();
  series.forEach(s => s.normalized.forEach(p => dateSet.add(p.date)));
  const dates = Array.from(dateSet).sort();

  const chartData = dates.map(date => {
    const point: Record<string, unknown> = { date };
    series.forEach(s => {
      const match = s.normalized.find(p => p.date === date);
      if (match) point[s.ticker] = match.return;
    });
    return point;
  });

  // Sample to ~120 points for performance
  const step = Math.max(1, Math.floor(chartData.length / 120));
  const sampled = chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1);

  const ticks = sampled.filter((_, i) => i % Math.floor(sampled.length / 7) === 0).map(d => d.date as string);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sampled} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            ticks={ticks}
            tickFormatter={d => { try { return format(parseISO(d), 'MMM yy'); } catch { return d; } }}
            tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: '#1e1e35' }} tickLine={false}
          />
          <YAxis
            tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
            tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false} tickLine={false} width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#2d2d50" strokeWidth={1} />

          {series.map((s, i) => (
            <Line
              key={s.ticker}
              type="monotone"
              dataKey={s.ticker}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}

          <Legend
            wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-mono)', paddingTop: '8px' }}
            formatter={(v, entry) => {
              const last = series.find(s => s.ticker === v)?.normalized.slice(-1)[0];
              const ret = last?.return ?? 0;
              return (
                <span style={{ color: (entry as { color: string }).color }}>
                  {v} {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
                </span>
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
