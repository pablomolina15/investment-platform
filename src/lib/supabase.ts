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
