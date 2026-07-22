import type { LineItem, Service } from '@shared/types';

const toLineItem = (s: Service): LineItem => ({
  service_name: s.service,
  rate: 0,
  quantity: 0,
  acct_num: s.acct_num,
  parent_account: s.parent_account,
});

/* Given a selected income item, find its matching cost item(s) via the associated_cost_ids
   junction (UUIDs that point to cost catalog rows). */
export function matchAssociatedCosts(income: Service, costCatalog: Service[]): LineItem[] {
  if (!income.associated_cost_ids?.length) return [];
  const wanted = new Set(income.associated_cost_ids);
  return costCatalog.filter((c) => wanted.has(c.id)).map((c) => toLineItem(c));
}

export const incomeToLineItem = toLineItem;
