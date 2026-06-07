'use client';

import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { TechnicalData } from '@/types/finance';
import { format, parseISO } from 'date-fns';

interface Props { data: TechnicalData[] }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-border rounded-lg p-2.5 text-xs font-mono">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p, i) => p.value != null && (
        <div key={i} className="flex justify-between gap-3">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-text-primary">{p.value.toFixed(4)}</span>
        </div>
      ))}
    </div>
  );
};

export default function MACDChart({ data }: Props) {
  const step = Math.max(1, Math.floor(data.length / 6));
  const ticks = data.filter((_, i) => i % step === 0).map(d => d.date);
  const tickFormatter = (d: string) => { try { return format(parseISO(d), 'MMM yy'); } catch { return d; } };

  // Color histogram bars by sign
  const coloredData = data.map(d => ({
    ...d,
    histPos: d.macdHistogram != null && d.macdHistogram >= 0 ? d.macdHistogram : null,
    histNeg: d.macdHistogram != null && d.macdHistogram < 0 ? d.macdHistogram : null,
  }));

  return (
    <div className="h-40">
      <p className="text-xs font-mono text-text-muted mb-2 px-1">MACD (12, 26, 9)</p>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={coloredData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" ticks={ticks} tickFormatter={tickFormatter}
            tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: '#1e1e35' }} tickLine={false} />
          <YAxis tick={{ fill: '#8888aa', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false} tickLine={false} width={40} tickFormatter={v => v.toFixed(2)} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#2d2d50" />

          <Bar dataKey="histPos" name="Hist +" fill="#00ff8877" stroke="none" radius={[1,1,0,0]} />
          <Bar dataKey="histNeg" name="Hist −" fill="#ff3b6b77" stroke="none" radius={[0,0,1,1]} />
          <Line dataKey="macd" name="MACD" stroke="#00d4ff" strokeWidth={1.5} dot={false} connectNulls />
          <Line dataKey="macdSignal" name="Signal" stroke="#ffd166" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
