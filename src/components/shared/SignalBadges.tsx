import type { TechnicalSignals } from '@/types/finance';
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  signals: TechnicalSignals;
}

export default function SignalBadges({ signals }: Props) {
  const items = [
    {
      label: signals.golden_cross ? '🌟 Golden Cross' : signals.death_cross ? '💀 Death Cross' : `Tendencia ${signals.trend === 'bullish' ? 'Alcista' : signals.trend === 'bearish' ? 'Bajista' : 'Neutral'}`,
      type: signals.golden_cross ? 'bullish' : signals.death_cross ? 'bearish' : signals.trend === 'bullish' ? 'bullish' : signals.trend === 'bearish' ? 'bearish' : 'neutral',
    },
    signals.rsi_value !== null && {
      label: signals.rsi_overbought
        ? `RSI ${signals.rsi_value} — Sobrecompra`
        : signals.rsi_oversold
        ? `RSI ${signals.rsi_value} — Sobreventa`
        : `RSI ${signals.rsi_value} — Neutral`,
      type: signals.rsi_overbought ? 'bearish' : signals.rsi_oversold ? 'bullish' : 'neutral',
    },
    (signals.macd_bullish || signals.macd_bearish) && {
      label: signals.macd_bullish ? 'MACD Cruce Alcista' : 'MACD Cruce Bajista',
      type: signals.macd_bullish ? 'bullish' : 'bearish',
    },
    (signals.price_above_bb_upper || signals.price_below_bb_lower) && {
      label: signals.price_above_bb_upper ? 'Precio sobre BB Superior' : 'Precio bajo BB Inferior',
      type: signals.price_above_bb_upper ? 'bearish' : 'bullish',
    },
  ].filter(Boolean) as { label: string; type: 'bullish' | 'bearish' | 'neutral' }[];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border',
            item.type === 'bullish' && 'bg-accent-green/10 border-accent-green/30 text-accent-green',
            item.type === 'bearish' && 'bg-accent-red/10 border-accent-red/30 text-accent-red',
            item.type === 'neutral' && 'bg-text-muted/10 border-text-muted/20 text-text-secondary'
          )}
        >
          {item.type === 'bullish' && <TrendingUp className="w-3 h-3" />}
          {item.type === 'bearish' && <TrendingDown className="w-3 h-3" />}
          {item.type === 'neutral' && <Minus className="w-3 h-3" />}
          {item.label}
        </span>
      ))}
    </div>
  );
}
