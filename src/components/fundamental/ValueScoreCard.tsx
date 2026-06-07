'use client';

import type { ValueScore } from '@/types/finance';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

interface Props { valueScore: ValueScore }

export default function ValueScoreCard({ valueScore }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { score, rating, color, criteria, summary } = valueScore;

  const colorMap = {
    green:  { ring: 'stroke-accent-green',  text: 'text-accent-green',  bg: 'bg-accent-green/10',  border: 'border-accent-green/30' },
    blue:   { ring: 'stroke-accent-cyan',   text: 'text-accent-cyan',   bg: 'bg-accent-cyan/10',   border: 'border-accent-cyan/30' },
    yellow: { ring: 'stroke-accent-yellow', text: 'text-accent-yellow', bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/30' },
    red:    { ring: 'stroke-accent-red',    text: 'text-accent-red',    bg: 'bg-accent-red/10',    border: 'border-accent-red/30' },
  };
  const c = colorMap[color];

  // SVG ring
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={clsx('bg-bg-card border rounded-xl p-5 animate-slide-up opacity-0', c.border)} style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-base text-text-primary">Value Score</h3>
          <p className="text-xs text-text-muted font-mono mt-0.5">Benjamin Graham style</p>
        </div>
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#1e1e35" strokeWidth="8" />
            <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8"
              className={c.ring}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={clsx('font-display font-bold text-xl leading-none', c.text)}>{score}</span>
            <span className="text-xs text-text-muted font-mono">/100</span>
          </div>
        </div>
      </div>

      <div className={clsx('inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-mono font-bold border mb-3', c.bg, c.border, c.text)}>
        {rating}
      </div>
      <p className="text-xs text-text-muted font-mono mb-4">{summary}</p>

      {/* Criteria list */}
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary font-mono transition-colors w-full">
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Ocultar criterios' : 'Ver criterios'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 animate-fade-in">
          {criteria.map((c2, i) => (
            <div key={i} className="flex items-start gap-2.5">
              {c2.passed
                ? <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" />
                : <XCircle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
              }
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-primary">{c2.name}</span>
                  <span className="text-xs font-mono text-text-muted">({c2.points_earned}/{c2.points_max}pts)</span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{c2.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
