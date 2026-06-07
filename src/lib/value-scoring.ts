import type { FundamentalMetrics, ValueCriterion, ValueScore } from '@/types/finance';

export function calculateValueScore(metrics: FundamentalMetrics): ValueScore {
  const criteria: ValueCriterion[] = [];
  let totalPoints = 0;
  let maxPoints = 0;

  function addCriterion(
    name: string,
    description: string,
    passed: boolean,
    points: number,
    detail: string
  ) {
    maxPoints += points;
    const earned = passed ? points : 0;
    totalPoints += earned;
    criteria.push({ name, description, passed, points_earned: earned, points_max: points, detail });
  }

  const { pe_ratio, pb_ratio, debt_to_equity, profit_margin, current_ratio, roe, revenue_growth_yoy, peg_ratio, dividend_yield } = metrics;

  // 1. PER razonable
  if (pe_ratio !== null) {
    addCriterion('PER Razonable', 'P/E < 25', pe_ratio < 25, 15, `PER: ${pe_ratio.toFixed(1)}`);
  }

  // 2. Price-to-Book
  if (pb_ratio !== null) {
    addCriterion('P/Book Bajo', 'P/B < 3.0', pb_ratio < 3.0, 10, `P/B: ${pb_ratio.toFixed(2)}`);
  }

  // 3. Deuda controlada
  if (debt_to_equity !== null) {
    addCriterion('Deuda Controlada', 'D/E < 100%', debt_to_equity < 100, 15, `D/E: ${debt_to_equity.toFixed(1)}%`);
  }

  // 4. Margen neto
  if (profit_margin !== null) {
    const pct = profit_margin < 1 ? profit_margin * 100 : profit_margin;
    addCriterion('Rentabilidad', 'Margen neto > 5%', pct > 5, 15, `Margen: ${pct.toFixed(1)}%`);
  }

  // 5. Liquidez
  if (current_ratio !== null) {
    addCriterion('Liquidez', 'Current Ratio > 1.5', current_ratio > 1.5, 10, `Ratio: ${current_ratio.toFixed(2)}`);
  }

  // 6. ROE
  if (roe !== null) {
    const roePct = roe < 1 ? roe * 100 : roe;
    addCriterion('ROE Elevado', 'ROE > 15%', roePct > 15, 15, `ROE: ${roePct.toFixed(1)}%`);
  }

  // 7. Crecimiento ingresos
  if (revenue_growth_yoy !== null) {
    addCriterion('Crecimiento YoY', 'Ingresos crecen > 5%', revenue_growth_yoy > 5, 10, `Crecimiento: ${revenue_growth_yoy.toFixed(1)}%`);
  }

  // 8. PEG ratio
  if (peg_ratio !== null && peg_ratio > 0) {
    addCriterion('PEG Ratio', 'PEG < 1.5', peg_ratio < 1.5, 10, `PEG: ${peg_ratio.toFixed(2)}`);
  }

  // 9. Dividendo (bonus)
  if (dividend_yield !== null) {
    const dyPct = dividend_yield < 1 ? dividend_yield * 100 : dividend_yield;
    addCriterion('Dividendo', 'Dividend Yield > 1%', dyPct > 1, 5, `Yield: ${dyPct.toFixed(2)}%`);
  }

  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  let rating: ValueScore['rating'];
  let color: ValueScore['color'];
  if (score >= 75) { rating = 'EXCELENTE'; color = 'green'; }
  else if (score >= 55) { rating = 'BUENA'; color = 'blue'; }
  else if (score >= 35) { rating = 'MODERADA'; color = 'yellow'; }
  else { rating = 'DÉBIL'; color = 'red'; }

  return {
    score,
    rating,
    color,
    criteria,
    summary: `${criteria.filter(c => c.passed).length}/${criteria.length} criterios cumplidos`,
  };
}
