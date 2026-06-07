'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { TechnicalData } from '@/types/finance';
import { format, parseISO } from 'date-fns';

interface Props { data: TechnicalData[] }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length || payload[0].value == null) return null;
  const v = payload[0].value;
  const color = v > 70 ? '#ff3b6b' : v < 30 ? '#00ff88' : '#00d4ff';
  return (
    <div className="bg-bg-card border border-border rounded-lg p-2.5 text-xs font-mono">
      <p className="text-text-muted mb-1">{label}</p>
      <p style={{ color }}>RSI: {v.toFixed(2)}</p>
      {v > 70 && <p className="text-accent-red mt-0.5">⚠ Sobrecompra</p>}
      {v < 30 && <p className="text-accent-green mt-0.5">⚠ Sobreventa</p>}
    </div>
  );
};

export default function RSIChart({ data }: Props) {
  const step = Math.max(1, Math.floor(data.length / 6));
  const ticks = data.filter((_, i) => i % step === 0).map(d => d.date);
  const tickFormatter = (d: string) => { try { return format(parseISO(d), 'MMM yy'); } catch { return d; } };

  return (
    <div className="h-40">
      <p className="text-xs font-mono text-text-muted mb-2 px-1">RSI (14)</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" ticks={ticks} tickFormatter={tickFormatter}
            tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: '#1e1e35' }} tickLine={false} />
          <YAxis domain={[0, 100]} ticks={[0, 30, 50, 70, 100]}
            tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false} tickLine={false} width={28} />
          <Tooltip content={<CustomTooltip />} />

          {/* Zones */}
          <ReferenceLine y={70} stroke="#ff3b6b" strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: '70', fill: '#ff3b6b', fontSize: 9, fontFamily: 'var(--font-mono)' }} />
          <ReferenceLine y={30} stroke="#00ff88" strokeDasharray="4 2" strokeOpacity={0.6} label={{ value: '30', fill: '#00ff88', fontSize: 9, fontFamily: 'var(--font-mono)' }} />
          <ReferenceLine y={50} stroke="#4a4a6a" strokeDasharray="2 4" strokeOpacity={0.4} />

          <Line dataKey="rsi" stroke="#00d4ff" strokeWidth={1.5} dot={false} connectNulls
            activeDot={{ r: 3, fill: '#00d4ff', strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
