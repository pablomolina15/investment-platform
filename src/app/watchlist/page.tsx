'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/shared/Navbar';
import TickerSearch from '@/components/shared/TickerSearch';
import { useAuth } from '@/components/auth/AuthProvider';
import AuthModal from '@/components/auth/AuthModal';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { getCloudWatchlist, addToCloudWatchlist, removeFromCloudWatchlist } from '@/lib/supabase';
import { formatPrice } from '@/lib/indicators';
import { generateDemoPrices, generateDemoFundamentals } from '@/lib/demo-data';
import { calculateValueScore } from '@/lib/value-scoring';
import { clsx } from 'clsx';
import { Star, Trash2, BarChart2, BookOpen, Brain, TrendingUp, TrendingDown, Plus, RefreshCw, Cloud, HardDrive, LogIn } from 'lucide-react';

interface WatchItem { ticker: string; addedAt: string; notes?: string; price?: number; changePct?: number; valueScore?: number; valueRating?: string; valueColor?: string; pe?: number | null; marketCap?: number | null; loaded?: boolean; }

const scoreCC: Record<string,string> = { green:'text-accent-green bg-accent-green/10 border-accent-green/25', blue:'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/25', yellow:'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/25', red:'text-accent-red bg-accent-red/10 border-accent-red/25' };
function fmtCap(v?: number|null) { if(!v) return 'N/A'; if(v>=1e12) return `${(v/1e12).toFixed(1)}T`; if(v>=1e9) return `${(v/1e9).toFixed(1)}B`; if(v>=1e6) return `${(v/1e6).toFixed(0)}M`; return String(v); }

async function enrich(ticker: string): Promise<Partial<WatchItem>> {
  try {
    const [pr, fr] = await Promise.all([fetch(`/api/prices?ticker=${ticker}&period=3mo`), fetch(`/api/fundamentals?ticker=${ticker}`)]);
    const pd = await pr.json(); const fd = await fr.json();
    const d = pd.data ?? []; const last = d[d.length-1]; const prev = d[d.length-2];
    const vs = fd.value_score;
    return { price: last?.close, changePct: last&&prev ? ((last.close-prev.close)/prev.close)*100 : undefined, valueScore: vs?.score, valueRating: vs?.rating, valueColor: vs?.color, pe: fd.metrics?.pe_ratio, marketCap: fd.metrics?.market_cap, loaded: true };
  } catch {
    const prices = generateDemoPrices(ticker, 5); const last = prices[prices.length-1]; const prev = prices[prices.length-2];
    const metrics = generateDemoFundamentals(ticker); const vs = calculateValueScore(metrics);
    return { price: last?.close, changePct: last&&prev ? ((last.close-prev.close)/prev.close)*100 : undefined, valueScore: vs.score, valueRating: vs.rating, valueColor: vs.color, pe: metrics.pe_ratio, marketCap: metrics.market_cap, loaded: true };
  }
}

export default function WatchlistPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [localList, setLocalList] = useLocalStorage<WatchItem[]>('stocklens_watchlist', []);
  const [items, setItems] = useState<WatchItem[]>([]);
  const [input, setInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const isCloud = !!user;

  const loadList = useCallback(async () => {
    let base: WatchItem[] = [];
    if (isCloud) {
      setSyncing(true);
      const cloud = await getCloudWatchlist(user!.id);
      base = cloud.map(c => ({ ticker: c.ticker, addedAt: c.added_at, notes: c.notes ?? '' }));
      setSyncing(false);
    } else { base = localList; }
    setItems(base.map(i => ({ ...i, loaded: false })));
    const enriched = await Promise.all(base.map(async item => ({ ...item, ...(await enrich(item.ticker)) })));
    setItems(enriched);
    if (!isCloud) setLocalList(enriched);
  }, [isCloud, user]); // eslint-disable-line

  useEffect(() => { loadList(); }, [isCloud]); // eslint-disable-line

  async function addTicker(t: string) {
    const upper = t.trim().toUpperCase(); if (!upper || items.some(i => i.ticker === upper)) return;
    setInput('');
    const newItem: WatchItem = { ticker: upper, addedAt: new Date().toISOString(), loaded: false };
    setItems(prev => [newItem, ...prev]);
    if (isCloud) await addToCloudWatchlist(user!.id, upper);
    else setLocalList(prev => [newItem, ...prev]);
    const enriched = await enrich(upper);
    setItems(prev => prev.map(i => i.ticker === upper ? { ...i, ...enriched } : i));
    if (!isCloud) setLocalList(prev => prev.map(i => i.ticker === upper ? { ...i, ...enriched } : i));
  }

  async function remove(ticker: string) {
    setItems(prev => prev.filter(i => i.ticker !== ticker));
    if (isCloud) await removeFromCloudWatchlist(user!.id, ticker);
    else setLocalList(prev => prev.filter(i => i.ticker !== ticker));
  }

  const gainers = items.filter(i => (i.changePct??0) > 0).length;
  const losers  = items.filter(i => (i.changePct??0) < 0).length;

  return (
    <div className="min-h-screen bg-bg-primary bg-grid">
      <Navbar />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-12">
        <div className="mb-6 animate-slide-up opacity-0" style={{ animationFillMode:'forwards' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent-yellow/20 border border-accent-yellow/40 flex items-center justify-center"><Star className="w-4 h-4 text-accent-yellow" /></div>
            <span className="text-xs font-mono text-accent-yellow uppercase tracking-widest">Portfolio</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mb-1">Mi <span className="text-accent-yellow">Watchlist</span></h1>
          <div className="flex items-center gap-2 mt-1">
            {isCloud
              ? <span className="flex items-center gap-1.5 text-xs font-mono text-accent-green bg-accent-green/10 border border-accent-green/25 px-2.5 py-1 rounded-full"><Cloud className="w-3 h-3" /> Sincronizada · {user!.email}</span>
              : <span className="flex items-center gap-1.5 text-xs font-mono text-text-muted bg-bg-card border border-border px-2.5 py-1 rounded-full"><HardDrive className="w-3 h-3" /> Guardada localmente</span>}
            {syncing && <span className="text-xs font-mono text-accent-cyan animate-pulse">Sincronizando…</span>}
          </div>
        </div>

        {!isCloud && (
          <div className="bg-gradient-to-r from-accent-cyan/8 to-accent-purple/8 border border-accent-cyan/20 rounded-xl p-4 mb-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center flex-shrink-0"><Cloud className="w-5 h-5 text-accent-cyan" /></div>
            <div className="flex-1">
              <p className="text-sm font-mono font-bold text-text-primary">Sincroniza en todos tus dispositivos</p>
              <p className="text-xs text-text-muted mt-0.5">Inicia sesión para guardar tu watchlist en la nube con Supabase. Totalmente gratis.</p>
            </div>
            <button onClick={() => setShowAuth(true)} className="flex items-center gap-1.5 px-4 py-2 bg-accent-cyan text-bg-primary font-mono font-bold text-xs rounded-lg hover:bg-accent-cyan/90 transition-all flex-shrink-0">
              <LogIn className="w-3.5 h-3.5" /> Entrar
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <TickerSearch value={input} onChange={setInput} onSubmit={addTicker} placeholder="Añadir ticker…" />
          <button onClick={() => addTicker(input)} className="px-4 py-2 bg-accent-yellow/15 border border-accent-yellow/40 text-accent-yellow rounded-lg hover:bg-accent-yellow/25 transition-all flex items-center gap-2 text-sm font-mono"><Plus className="w-4 h-4" /> Añadir</button>
          <div className="flex gap-3 sm:ml-auto items-center">
            <span className="text-xs font-mono text-accent-green flex items-center gap-1"><TrendingUp className="w-3 h-3" />{gainers}</span>
            <span className="text-xs font-mono text-accent-red flex items-center gap-1"><TrendingDown className="w-3 h-3" />{losers}</span>
            <button onClick={async () => { setRefreshing(true); await loadList(); setRefreshing(false); }} disabled={refreshing || items.length===0}
              className="flex items-center gap-1.5 px-3 py-2 bg-bg-card border border-border text-text-muted rounded-lg hover:text-text-primary transition-all disabled:opacity-40 text-xs font-mono">
              <RefreshCw className={clsx('w-3.5 h-3.5', refreshing && 'animate-spin')} /> {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </div>

        {items.length === 0 && !syncing && (
          <div className="text-center py-20"><div className="text-6xl mb-4">⭐</div><p className="font-display text-xl text-text-secondary mb-2">Tu watchlist está vacía</p><p className="text-sm text-text-muted font-mono">Añade tickers para hacer seguimiento de tus acciones favoritas</p></div>
        )}

        {items.length > 0 && (
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-border">{['Ticker','Precio','Cambio 1d','P/E','Cap.','Value Score','Acciones'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-mono text-text-muted uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>
                  {items.map((item, idx) => {
                    const up = (item.changePct??0) >= 0;
                    return (
                      <tr key={item.ticker} className="border-b border-border/50 hover:bg-bg-elevated/40 transition-colors animate-slide-up opacity-0" style={{ animationDelay:`${idx*35}ms`, animationFillMode:'forwards' }}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-accent-yellow fill-accent-yellow flex-shrink-0" /><span className="font-mono font-bold text-accent-cyan">{item.ticker}</span></div>
                          <p className="text-xs text-text-muted font-mono mt-0.5 pl-5">{new Date(item.addedAt).toLocaleDateString('es-ES')}</p>
                        </td>
                        <td className="px-5 py-4">{!item.loaded ? <div className="skeleton h-5 w-20 rounded" /> : <span className="font-mono font-bold text-text-primary">${formatPrice(item.price)}</span>}</td>
                        <td className="px-5 py-4">{!item.loaded ? <div className="skeleton h-5 w-16 rounded" /> : <span className={clsx('flex items-center gap-1 text-sm font-mono w-fit', up?'text-accent-green':'text-accent-red')}>{up?<TrendingUp className="w-3.5 h-3.5"/>:<TrendingDown className="w-3.5 h-3.5"/>}{up?'+':''}{item.changePct?.toFixed(2)??'N/A'}%</span>}</td>
                        <td className="px-5 py-4"><span className="font-mono text-sm text-text-secondary">{item.pe!=null?item.pe.toFixed(1):'N/A'}</span></td>
                        <td className="px-5 py-4"><span className="font-mono text-sm text-text-secondary">{fmtCap(item.marketCap)}</span></td>
                        <td className="px-5 py-4">{!item.loaded ? <div className="skeleton h-6 w-28 rounded-full" /> : item.valueScore!=null ? <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border', scoreCC[item.valueColor??'blue'])}>{item.valueScore}/100 · {item.valueRating}</span> : <span className="text-text-muted text-xs font-mono">N/A</span>}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            {[{icon:BarChart2,href:`/technical?ticker=${item.ticker}`,c:'hover:text-accent-cyan hover:bg-accent-cyan/10'},{icon:BookOpen,href:`/fundamental?ticker=${item.ticker}`,c:'hover:text-accent-green hover:bg-accent-green/10'},{icon:Brain,href:`/ml?ticker=${item.ticker}`,c:'hover:text-accent-purple hover:bg-accent-purple/10'}].map(({icon:Icon,href,c})=>(
                              <button key={href} onClick={()=>router.push(href)} className={clsx('p-1.5 text-text-muted rounded-lg transition-all',c)}><Icon className="w-3.5 h-3.5" /></button>
                            ))}
                            <button onClick={()=>remove(item.ticker)} className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-all ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
