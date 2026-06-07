# StockLens — Investment Analytics Platform

Plataforma de análisis bursátil con indicadores técnicos, métricas fundamentales y Value Investing scoring.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase · Yahoo Finance · Recharts

---

## 🚀 Despliegue rápido

### 1. Clonar y instalar

```bash
git clone https://github.com/tu-usuario/investment-platform.git
cd investment-platform
npm install
```

### 2. Variables de entorno

Copia `.env.local.example` a `.env.local` y rellena:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
PYTHON_SERVICE_URL=           # Dejar vacío en Fase 1
```

### 3. Supabase (opcional pero recomendado)

Ejecuta `supabase_migration.sql` en el SQL Editor de tu proyecto Supabase.  
Sin Supabase la app funciona igualmente usando datos demo y sin caché.

### 4. Desarrollo local

```bash
npm run dev
# → http://localhost:3000
```

### 5. Deploy en Vercel

```bash
# Opción A: CLI
npx vercel

# Opción B: Conecta el repo en vercel.com/new
# Añade las env vars en Settings → Environment Variables
```

---

## 📁 Estructura

```
src/
├── app/
│   ├── page.tsx                  # Dashboard / Home
│   ├── technical/page.tsx        # Análisis técnico
│   ├── fundamental/page.tsx      # Análisis fundamental
│   └── api/
│       ├── prices/route.ts       # GET /api/prices?ticker=AAPL&period=1y
│       ├── fundamentals/route.ts # GET /api/fundamentals?ticker=AAPL
│       └── health/route.ts       # GET /api/health
├── components/
│   ├── charts/                   # PriceChart, RSIChart, MACDChart
│   ├── fundamental/              # MetricCard, ValueScoreCard
│   └── shared/                   # Navbar, TickerSearch, SignalBadges
├── lib/
│   ├── indicators.ts             # SMA, EMA, RSI, MACD, Bollinger (TS)
│   ├── value-scoring.ts          # Value Investing checklist
│   ├── demo-data.ts              # Datos sintéticos (fallback)
│   └── supabase.ts               # Cliente + helpers de caché
└── types/finance.ts              # Interfaces TypeScript
```

---

## 🔄 Flujo de datos

```
Usuario busca ticker
        │
        ▼
API Route /api/prices
        │
   ┌────┴────┐
   │  Cache  │ ← Supabase (TTL 1h precios / 24h fundamentales)
   └────┬────┘
        │ miss
        ▼
Python Service ← si PYTHON_SERVICE_URL configurado
        │ fallo
        ▼
Yahoo Finance (unofficial API directa)
        │ fallo
        ▼
Demo data (siempre disponible, generado localmente)
```

---

## 📊 Indicadores implementados

| Indicador | Parámetros | Calculado en |
|-----------|-----------|-------------|
| SMA | 50, 200 días | TypeScript (local) |
| EMA | 50, 200 días | TypeScript (local) |
| RSI | 14 períodos | TypeScript (local) |
| MACD | 12, 26, 9 | TypeScript (local) |
| Bollinger Bands | 20, ±2σ | TypeScript (local) |
| Volume | — | Yahoo Finance raw |

## 🏆 Value Score (0-100)

| Criterio | Puntos | Umbral |
|---------|--------|--------|
| PER Razonable | 15 | P/E < 25 |
| P/Book Bajo | 10 | P/B < 3.0 |
| Deuda Controlada | 15 | D/E < 100% |
| Rentabilidad | 15 | Margen > 5% |
| Liquidez | 10 | Current Ratio > 1.5 |
| ROE Elevado | 15 | ROE > 15% |
| Crecimiento YoY | 10 | Revenue Growth > 5% |
| PEG Ratio | 10 | PEG < 1.5 |
| Dividendo | 5 | Yield > 1% |

---

## 🤖 Fase 2: Python ML Service

Cuando tengas listo el microservicio FastAPI:

1. Despliega en **Railway** o **Render** (free tier)
2. Añade `PYTHON_SERVICE_URL=https://tu-servicio.railway.app` en Vercel
3. El API Route automáticamente lo usará con fallback a Yahoo Finance

Modelos previstos:
- **LSTM** — Predicción de precio a 5-30 días con secuencias temporales
- **Random Forest** — Clasificación de tendencia (bullish/bearish/neutral)

---

## ⚡ Costes

| Servicio | Tier | Coste |
|---------|------|-------|
| Vercel | Hobby | **0€** |
| Supabase | Free (500MB, 2GB transfer) | **0€** |
| Yahoo Finance | Unofficial API | **0€** |
| Railway (Fase 2) | Starter 5$/mes crédito gratis | **0€** |
