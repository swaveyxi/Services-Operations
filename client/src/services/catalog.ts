import type { Service, ParentAccount, WorkplanTemplate } from '@shared/types';
import { api } from './api';

export type ServiceCatalog = {
  income: Service[];
  cost: Service[];
  parents: ParentAccount[];
};

export async function getServiceCatalog(unit: string): Promise<ServiceCatalog> {
  const res = await api.get(`/service-catalog?unit=${encodeURIComponent(unit)}`);
  const data = await res.json() as { incomes: Service[]; costs: Service[]; parentAccounts: ParentAccount[] };
  return {
    income: data.incomes,
    cost: data.costs,
    parents: data.parentAccounts,
  };
}

export async function getWorkplanTemplates(unit?: string): Promise<WorkplanTemplate[]> {
  const qs = unit ? `?unit=${encodeURIComponent(unit)}` : '';
  const res = await api.get(`/workplan-templates${qs}`);
  const rows: { template_id: string; template_name: string; activity_name: string }[] = await res.json();

  const map = new Map<string, WorkplanTemplate>();
  for (const row of rows) {
    if (!map.has(row.template_id)) {
      map.set(row.template_id, {
        id: row.template_id,
        template_id: row.template_id,
        template_name: row.template_name,
        activities: [],
      });
    }
    const tmpl = map.get(row.template_id)!;
    tmpl.activities.push({ sequence: tmpl.activities.length + 1, name: row.activity_name });
  }
  return Array.from(map.values());
}
