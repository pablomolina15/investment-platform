'use client';
import { useState, useCallback, useRef } from 'react';
import type { TechnicalResponse, FundamentalResponse, Period } from '@/types/finance';

// Simple in-memory cache
const memCache = new Map<string, { data: unknown; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 min client-side cache

async function fetchWithCache<T>(url: string): Promise<T> {
  const cached = memCache.get(url);
  if (cached && Date.now() - cached.ts < TTL) return cached.data as T;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  memCache.set(url, { data, ts: Date.now() });
  return data;
}

export function useTechnical() {
  const [data, setData] = useState<TechnicalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch_ = useCallback(async (ticker: string, period: Period) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true); setError(null);
    try {
      const d = await fetchWithCache<TechnicalResponse>(
        `/api/prices?ticker=${ticker.toUpperCase()}&period=${period}`
      );
      setData(d);
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError')
        setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally { setLoading(false); }
  }, []);

  return { data, loading, error, fetch: fetch_ };
}

export function useFundamental() {
  const [data, setData] = useState<FundamentalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async (ticker: string) => {
    setLoading(true); setError(null);
    try {
      const d = await fetchWithCache<FundamentalResponse>(
        `/api/fundamentals?ticker=${ticker.toUpperCase()}`
      );
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally { setLoading(false); }
  }, []);

  return { data, loading, error, fetch: fetch_ };
}

export interface MLPrediction {
  ticker: string;
  model: string;
  days_ahead: number;
  predictions: Array<{
    date: string;
    predicted_price: number;
    lower_bound: number;
    upper_bound: number;
    confidence: number;
  }>;
  feature_importance: Record<string, number> | null;
  accuracy_metrics: Record<string, number> | null;
  last_updated: string;
  disclaimer: string;
  source?: string;
}

export function useMLPrediction() {
  const [data, setData] = useState<MLPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async (ticker: string, model: string, days: number) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ml-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), model, days_ahead: days }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally { setLoading(false); }
  }, []);

  return { data, loading, error, fetch: fetch_ };
}
