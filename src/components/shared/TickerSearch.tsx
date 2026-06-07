'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, TrendingUp } from 'lucide-react';
import { POPULAR_TICKERS } from '@/types/finance';

interface Props {
  value: string;
  onChange: (ticker: string) => void;
  onSubmit: (ticker: string) => void;
  placeholder?: string;
}

export default function TickerSearch({ value, onChange, onSubmit, placeholder = 'Buscar ticker… (ej: AAPL)' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = query.length > 0
    ? POPULAR_TICKERS.filter(
        t => t.ticker.includes(query.toUpperCase()) || t.name.toLowerCase().includes(query.toLowerCase())
      )
    : POPULAR_TICKERS;

  function handleSelect(ticker: string) {
    setQuery(ticker);
    onChange(ticker);
    onSubmit(ticker);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && query.trim()) {
      handleSelect(query.trim().toUpperCase());
    }
    if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value.toUpperCase()); onChange(e.target.value.toUpperCase()); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 bg-bg-elevated border border-border rounded-lg font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan focus:shadow-glow-cyan transition-all duration-200"
        />
        {query && (
          <button onClick={() => { setQuery(''); onChange(''); inputRef.current?.focus(); }} className="absolute right-3.5 text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border rounded-lg shadow-card overflow-hidden z-50 animate-fade-in">
          <div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-accent-cyan" />
            <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
              {query ? 'Resultados' : 'Populares'}
            </span>
          </div>
          {filtered.map(item => (
            <button
              key={item.ticker}
              onClick={() => handleSelect(item.ticker)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-bg-elevated transition-colors text-left group"
            >
              <span className="font-mono font-bold text-sm text-accent-cyan group-hover:text-white transition-colors">
                {item.ticker}
              </span>
              <span className="text-xs text-text-secondary truncate ml-4">{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
