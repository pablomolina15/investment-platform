import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: 'green' | 'red' | 'yellow' | 'cyan' | 'none';
  description?: string;
  animationDelay?: number;
}

export default function MetricCard({ label, value, subValue, trend, highlight = 'none', description, animationDelay = 0 }: Props) {
  return (
    <div
      className={clsx(
        'bg-bg-card border rounded-xl p-4 flex flex-col gap-1.5 animate-slide-up opacity-0',
        highlight === 'green'  && 'border-accent-green/20 hover:border-accent-green/40',
        highlight === 'red'    && 'border-accent-red/20 hover:border-accent-red/40',
        highlight === 'yellow' && 'border-accent-yellow/20 hover:border-accent-yellow/40',
        highlight === 'cyan'   && 'border-accent-cyan/20 hover:border-accent-cyan/40',
        highlight === 'none'   && 'border-border hover:border-border-bright',
        'transition-colors duration-200'
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'forwards' }}
    >
      <p className="text-xs font-mono text-text-muted uppercase tracking-wider">{label}</p>

      <div className="flex items-end gap-2">
        <span className={clsx(
          'font-display font-bold text-xl leading-none',
          highlight === 'green'  && 'text-accent-green',
          highlight === 'red'    && 'text-accent-red',
          highlight === 'yellow' && 'text-accent-yellow',
          highlight === 'cyan'   && 'text-accent-cyan',
          highlight === 'none'   && 'text-text-primary',
        )}>
          {value}
        </span>
        {trend && (
          <span className={clsx(
            'mb-0.5',
            trend === 'up'      && 'text-accent-green',
            trend === 'down'    && 'text-accent-red',
            trend === 'neutral' && 'text-text-muted',
          )}>
            {trend === 'up'      && <TrendingUp className="w-4 h-4" />}
            {trend === 'down'    && <TrendingDown className="w-4 h-4" />}
            {trend === 'neutral' && <Minus className="w-4 h-4" />}
          </span>
        )}
      </div>

      {subValue && <p className="text-xs text-text-secondary font-mono">{subValue}</p>}
      {description && <p className="text-xs text-text-muted leading-relaxed mt-0.5">{description}</p>}
    </div>
  );
}
