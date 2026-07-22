import type { RevenueItemRow, CostItemRow } from '../models/campaigns';

export type ProfitabilitySummary = {
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  profit_percent: number;
};

export function calcProfitability(
  revenueItems: Pick<RevenueItemRow, 'quantity' | 'rate'>[],
  costItems: Pick<CostItemRow, 'quantity' | 'rate'>[],
): ProfitabilitySummary {
  const totalRevenue = revenueItems.reduce(
    (sum, i) =>
      sum + parseFloat(i.quantity as unknown as string) * parseFloat(i.rate as unknown as string),
    0,
  );
  const totalCost = costItems.reduce(
    (sum, i) =>
      sum + parseFloat(i.quantity as unknown as string) * parseFloat(i.rate as unknown as string),
    0,
  );
  const grossProfit = totalRevenue - totalCost;
  const profitabilityPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  return {
    total_revenue: totalRevenue,
    total_cost: totalCost,
    gross_profit: grossProfit,
    profit_percent: profitabilityPct,
  };
}
