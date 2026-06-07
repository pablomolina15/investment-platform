import { NextRequest, NextResponse } from 'next/server';

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  ticker?: string;
}

// Yahoo Finance RSS — completamente gratuito, sin API key
async function fetchYahooRSS(ticker: string): Promise<NewsItem[]> {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  const xml = await res.text();

  const items: NewsItem[] = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

  for (const raw of itemMatches.slice(0, 8)) {
    const title   = raw.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
                 ?? raw.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
    const link    = raw.match(/<link>(.*?)<\/link>/)?.[1]
                 ?? raw.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? '';
    const desc    = raw.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
                 ?? raw.match(/<description>(.*?)<\/description>/)?.[1] ?? '';
    const pubDate = raw.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? '';
    const source  = raw.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? 'Yahoo Finance';

    if (title && link) {
      items.push({
        title: decodeHtml(title.trim()),
        summary: decodeHtml(desc.replace(/<[^>]+>/g, '').trim().slice(0, 200)),
        url: link.trim(),
        source: source.trim(),
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        ticker: ticker.toUpperCase(),
      });
    }
  }
  return items;
}

function decodeHtml(s: string) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

// Market general news from multiple tickers
async function fetchMarketNews(): Promise<NewsItem[]> {
  const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'];
  const results = await Promise.allSettled(tickers.map(t => fetchYahooRSS(t)));
  const all: NewsItem[] = [];
  results.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value); });

  // Deduplicate by title similarity
  const seen = new Set<string>();
  return all.filter(item => {
    const key = item.title.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 20);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');

  try {
    const news = ticker ? await fetchYahooRSS(ticker.toUpperCase()) : await fetchMarketNews();
    return NextResponse.json({ news, source: 'yahoo_rss', count: news.length });
  } catch {
    // Demo fallback
    const demo = generateDemoNews(ticker ?? 'MARKET');
    return NextResponse.json({ news: demo, source: 'demo', count: demo.length });
  }
}

function generateDemoNews(ticker: string): NewsItem[] {
  const headlines = [
    [`${ticker}: Resultados trimestrales superan expectativas de analistas`, 'Los ingresos crecieron un 12% interanual, impulsados por la demanda en mercados emergentes.'],
    [`Analistas elevan precio objetivo de ${ticker} tras sólido guidance`, 'Varios bancos de inversión revisan al alza sus estimaciones para el próximo ejercicio.'],
    [`${ticker} anuncia expansión de su programa de recompra de acciones`, 'La compañía destinará 5.000 millones adicionales a la recompra durante los próximos 18 meses.'],
    [`Mercados globales en espera de datos macro clave esta semana`, 'Los inversores monitorizan de cerca las decisiones de política monetaria de la Fed.'],
    [`${ticker}: Nuevo contrato estratégico impulsa perspectivas de crecimiento`, 'El acuerdo podría añadir entre 200 y 400 millones a los ingresos del próximo año.'],
    [`Sector tecnológico lidera ganancias ante rotación del mercado`, 'El movimiento refleja renovado apetito por activos de crecimiento en el entorno actual.'],
  ];

  return headlines.map(([title, summary], i) => ({
    title,
    summary,
    url: '#',
    source: ['Reuters', 'Bloomberg', 'Financial Times', 'WSJ', 'MarketWatch', 'Seeking Alpha'][i % 6],
    publishedAt: new Date(Date.now() - i * 3_600_000).toISOString(),
    ticker: ticker.toUpperCase(),
  }));
}
