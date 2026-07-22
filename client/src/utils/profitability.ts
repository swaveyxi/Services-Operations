import type { LineItem, Profitability } from '@shared/types';

const sum = (items: LineItem[]) =>
  items.reduce((acc, i) => acc + (Number(i.rate) || 0) * (Number(i.quantity) || 0), 0);

export function computeProfitability(revenue: LineItem[], cost: LineItem[]): Profitability {
  const total_revenue = sum(revenue);
  const total_cost = sum(cost);
  const gross_profit = total_revenue - total_cost;
  const profit_percent = total_revenue === 0 ? 0 : (gross_profit / total_revenue) * 100;
  return { total_revenue, total_cost, gross_profit, profit_percent };
}
