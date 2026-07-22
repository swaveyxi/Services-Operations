import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';

// template_id groups multiple activity rows under one template name.
// template_name is intentionally stored per-row (denormalized from template_id)
// to preserve the template name at point-in-time of configuration.
export const workplanTemplates = table(
  'workplan_templates',
  {
    id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    template_id: t.varchar({ length: 100 }).notNull(),
    template_name: t.varchar({ length: 255 }).notNull(),
    activity_name: t.varchar({ length: 255 }).notNull(),
    unit: t.mysqlEnum(['Recruitment', 'Scholarships', 'Testing']),
    duration_days: t.int(),
  },
  (table) => [t.index('idx_wt_template').on(table.template_id, table.unit)],
);
