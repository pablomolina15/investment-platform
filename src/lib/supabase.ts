import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function createSupabaseBrowser() {
  return createBrowserClient(supabaseUrl, supabaseAnon);
}

export const supabase = createClient(supabaseUrl, supabaseAnon);

const CACHE_TTL_PRICES       = Number(process.env.CACHE_TTL_PRICES       ?? 3600)  * 1000;
const CACHE_TTL_FUNDAMENTALS = Number(process.env.CACHE_TTL_FUNDAMENTALS ?? 86400) * 1000;

function isFresh(cachedAt: string, ttl: number) {
  return Date.now() - new Date(cachedAt).getTime() < ttl;
}

export async function getCachedPrices(ticker: string, period: string) {
  if (!supabaseUrl) return null;
  try {
    const { data } = await supabase.from('price_cache').select('data,cached_at')
      .eq('ticker', ticker.toUpperCase()).eq('period', period).single();
    if (!data || !isFresh(data.cached_at, CACHE_TTL_PRICES)) return null;
    return data.data;
  } catch { return null; }
}

export async function setCachedPrices(ticker: string, period: string, payload: unknown) {
  if (!supabaseUrl) return;
  try {
    await supabase.from('price_cache').upsert(
      { ticker: ticker.toUpperCase(), period, data: payload, cached_at: new Date().toISOString() },
      { onConflict: 'ticker,period' }
    );
  } catch { /**/ }
}

export async function getCachedFundamentals(ticker: string) {
  if (!supabaseUrl) return null;
  try {
    const { data } = await supabase.from('fundamental_cache').select('data,cached_at')
      .eq('ticker', ticker.toUpperCase()).single();
    if (!data || !isFresh(data.cached_at, CACHE_TTL_FUNDAMENTALS)) return null;
    return data.data;
  } catch { return null; }
}

export async function setCachedFundamentals(ticker: string, payload: unknown) {
  if (!supabaseUrl) return;
  try {
    await supabase.from('fundamental_cache').upsert(
      { ticker: ticker.toUpperCase(), data: payload, cached_at: new Date().toISOString() },
      { onConflict: 'ticker' }
    );
  } catch { /**/ }
}

export interface CloudWatchlistItem {
  id: string;
  user_id: string;
  ticker: string;
  notes: string | null;
  added_at: string;
}

export async function getCloudWatchlist(userId: string): Promise<CloudWatchlistItem[]> {
  if (!supabaseUrl) return [];
  try {
    const { data } = await supabase.from('watchlists').select('*')
      .eq('user_id', userId).order('added_at', { ascending: false });
    return (data as CloudWatchlistItem[]) ?? [];
  } catch { return []; }
}

export async function addToCloudWatchlist(userId: string, ticker: string, notes = '') {
  if (!supabaseUrl) return null;
  try {
    const { data } = await supabase.from('watchlists').upsert(
      { user_id: userId, ticker: ticker.toUpperCase(), notes, added_at: new Date().toISOString() },
      { onConflict: 'user_id,ticker' }
    ).select().single();
    return data;
  } catch { return null; }
}

export async function removeFromCloudWatchlist(userId: string, ticker: string) {
  if (!supabaseUrl) return;
  try {
    await supabase.from('watchlists').delete()
      .eq('user_id', userId).eq('ticker', ticker.toUpperCase());
  } catch { /**/ }
}
// ── Añade esto al final de src/lib/supabase.ts ──────────────────────────────

export interface PortfolioTrade {
  id: string;
  user_id: string;
  ticker: string;
  broker: string;
  notes: string | null;
  // Buy
  buy_date: string;
  buy_shares: number;
  buy_price: number;
  buy_total: number;
  // Sell (null = open position)
  sell_date: string | null;
  sell_price: number | null;
  sell_total: number | null;
  // ML prediction
  ml_model: string | null;
  ml_days_ahead: number | null;
  ml_target_date: string | null;
  ml_pred_price: number | null;
  ml_pred_pct: number | null;
  // Meta
  created_at: string;
  updated_at: string;
}

export type NewTrade = Omit<PortfolioTrade, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export async function getPortfolioTrades(userId: string): Promise<PortfolioTrade[]> {
  if (!supabaseUrl) return [];
  try {
    const client = createSupabaseBrowser();
    const { data, error } = await client
      .from('portfolio_trades')
      .select('*')
      .eq('user_id', userId)
      .order('buy_date', { ascending: false });
    if (error) throw error;
    return (data as PortfolioTrade[]) ?? [];
  } catch (e) {
    console.error('[portfolio] getPortfolioTrades:', e);
    return [];
  }
}

export async function addPortfolioTrade(userId: string, trade: NewTrade): Promise<PortfolioTrade | null> {
  if (!supabaseUrl) return null;
  try {
    const client = createSupabaseBrowser();
    const { data, error } = await client
      .from('portfolio_trades')
      .insert({ ...trade, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data as PortfolioTrade;
  } catch (e) {
    console.error('[portfolio] addPortfolioTrade:', e);
    return null;
  }
}

export async function updatePortfolioTrade(tradeId: string, updates: Partial<NewTrade>): Promise<boolean> {
  if (!supabaseUrl) return false;
  try {
    const client = createSupabaseBrowser();
    const { error } = await client
      .from('portfolio_trades')
      .update(updates)
      .eq('id', tradeId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[portfolio] updatePortfolioTrade:', e);
    return false;
  }
}

export async function deletePortfolioTrade(tradeId: string): Promise<boolean> {
  if (!supabaseUrl) return false;
  try {
    const client = createSupabaseBrowser();
    const { error } = await client
      .from('portfolio_trades')
      .delete()
      .eq('id', tradeId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[portfolio] deletePortfolioTrade:', e);
    return false;
  }
}