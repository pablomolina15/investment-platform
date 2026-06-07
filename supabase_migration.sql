-- ============================================================
-- StockLens — Supabase Migration v2
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── Extensiones ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Price cache ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_cache (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker     VARCHAR(10)  NOT NULL,
  period     VARCHAR(5)   NOT NULL DEFAULT '1y',
  data       JSONB        NOT NULL,
  cached_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(ticker, period)
);

-- ─── Fundamental cache ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS fundamental_cache (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker     VARCHAR(10)  UNIQUE NOT NULL,
  data       JSONB        NOT NULL,
  cached_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── Watchlists (autenticadas) ───────────────────────────────
CREATE TABLE IF NOT EXISTS watchlists (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker     VARCHAR(10)  NOT NULL,
  notes      TEXT         DEFAULT '',
  added_at   TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- ─── ML Predictions (historial) ─────────────────────────────
CREATE TABLE IF NOT EXISTS ml_predictions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker           VARCHAR(10)   NOT NULL,
  model_type       VARCHAR(50),
  prediction_date  DATE,
  predicted_price  DECIMAL(12,4),
  confidence       DECIMAL(5,4),
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── Índices ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_price_cache_ticker  ON price_cache(ticker, period);
CREATE INDEX IF NOT EXISTS idx_fundamental_ticker  ON fundamental_cache(ticker);
CREATE INDEX IF NOT EXISTS idx_watchlist_user      ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_ticker_date      ON ml_predictions(ticker, prediction_date DESC);

-- ─── Row Level Security ──────────────────────────────────────

-- Price cache: lectura pública, escritura pública (API routes lo manejan)
ALTER TABLE price_cache       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundamental_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_prices"         ON price_cache;
DROP POLICY IF EXISTS "public_write_prices"        ON price_cache;
DROP POLICY IF EXISTS "public_update_prices"       ON price_cache;
DROP POLICY IF EXISTS "public_read_fundamentals"   ON fundamental_cache;
DROP POLICY IF EXISTS "public_write_fundamentals"  ON fundamental_cache;
DROP POLICY IF EXISTS "public_update_fundamentals" ON fundamental_cache;

CREATE POLICY "public_read_prices"         ON price_cache       FOR SELECT USING (true);
CREATE POLICY "public_write_prices"        ON price_cache       FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_prices"       ON price_cache       FOR UPDATE USING (true);

CREATE POLICY "public_read_fundamentals"   ON fundamental_cache FOR SELECT USING (true);
CREATE POLICY "public_write_fundamentals"  ON fundamental_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_fundamentals" ON fundamental_cache FOR UPDATE USING (true);

-- Watchlists: sólo el propietario puede ver/editar las suyas
DROP POLICY IF EXISTS "user_watchlist_select" ON watchlists;
DROP POLICY IF EXISTS "user_watchlist_insert" ON watchlists;
DROP POLICY IF EXISTS "user_watchlist_delete" ON watchlists;

CREATE POLICY "user_watchlist_select" ON watchlists
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_watchlist_insert" ON watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_watchlist_update" ON watchlists
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_watchlist_delete" ON watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Para habilitar OAuth en Supabase ────────────────────────
-- Ve a: Authentication → Providers
-- GitHub: activa y añade Client ID + Secret de github.com/settings/applications/new
-- Google: activa y añade Client ID + Secret de console.cloud.google.com
-- Redirect URL para ambos: https://[tu-proyecto].supabase.co/auth/v1/callback
