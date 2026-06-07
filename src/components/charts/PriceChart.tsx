'use client';

import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Area,
} from 'recharts';
import type { TechnicalData } from '@/types/finance';
import { formatPrice } from '@/lib/indicators';
import { format, parseISO } from 'date-fns';

interface Props {
  data: TechnicalData[];
  showSMA50?: boolean;
  showSMA200?: boolean;
  showEMA50?: boolean;
  showBB?: boolean;
}

const CustomTooltip = ({ active, payload, label }: {active?: boolean; payload?: {name: string; value: number; color: string}[]; label?: string}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 shadow-card text-xs font-mono">
      <p className="text-text-muted mb-2">{label}</p>
      {payload.map((p, i) => (
        p.value != null && (
          <div key={i} className="flex items-center gap-2 justify-between">
            <span style={{ color: p.color }} className="truncate">{p.name}</span>
            <span className="text-text-primary ml-3">{formatPrice(p.value)}</span>
          </div>
        )
      ))}
    </div>
  );
};

export default function PriceChart({ data, showSMA50 = true, showSMA200 = true, showEMA50 = false, showBB = true }: Props) {
  const tickFormatter = (date: string) => {
    try { return format(parseISO(date), 'MMM yy'); } catch { return date; }
  };

  // Show every Nth label to avoid crowding
  const step = Math.max(1, Math.floor(data.length / 8));
  const ticks = data.filter((_, i) => i % step === 0).map(d => d.date);

  return (
    <div className="w-full">
      {/* Price + MAs + BB */}
      <div className="h-72 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={tickFormatter}
              tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: '#1e1e35' }}
              tickLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={v => `$${v}`}
              tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Bollinger Bands */}
            {showBB && (
              <>
                <Area dataKey="bbUpper" stroke="rgba(123,97,255,0.3)" fill="rgba(123,97,255,0.04)" strokeDasharray="3 3" dot={false} name="BB Superior" legendType="none" />
                <Line dataKey="bbMiddle" stroke="rgba(123,97,255,0.4)" strokeDasharray="4 2" dot={false} name="BB Media" strokeWidth={1} legendType="none" />
                <Area dataKey="bbLower" stroke="rgba(123,97,255,0.3)" fill="rgba(123,97,255,0.04)" strokeDasharray="3 3" dot={false} name="BB Inferior" legendType="none" />
              </>
            )}

            {/* Moving averages */}
            {showSMA50  && <Line dataKey="sma50"  stroke="#ffd166" strokeWidth={1.5} dot={false} name="SMA 50"  connectNulls />}
            {showSMA200 && <Line dataKey="sma200" stroke="#ff3b6b" strokeWidth={1.5} dot={false} name="SMA 200" connectNulls />}
            {showEMA50  && <Line dataKey="ema50"  stroke="#7b61ff" strokeWidth={1.5} dot={false} name="EMA 50"  connectNulls strokeDasharray="4 2" />}

            {/* Price */}
            <Line
              dataKey="close"
              stroke="#00d4ff"
              strokeWidth={2}
              dot={false}
              name="Precio"
              activeDot={{ r: 4, fill: '#00d4ff', strokeWidth: 0 }}
            />

            <Legend
              wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-mono)', paddingTop: '8px' }}
              formatter={(value) => <span style={{ color: '#8888aa' }}>{value}</span>}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Volume */}
      <div className="h-20 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Bar
              dataKey="volume"
              name="Volumen"
              fill="rgba(0,212,255,0.15)"
              stroke="rgba(0,212,255,0.3)"
              strokeWidth={0}
              radius={[1, 1, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-text-muted font-mono mt-0.5">VOLUMEN</p>
    </div>
  );
}
