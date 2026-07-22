import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';

export const serviceIncomes = table(
  'service_incomes',
  {
    id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    qb_id: t.varchar({ length: 50 }).unique(),
    acct_num: t.varchar({ length: 20 }).unique().notNull(),
    unit: t.mysqlEnum(['Recruitment', 'Scholarships', 'Testing']).notNull(),
    service: t.varchar({ length: 255 }).notNull(),
    parent_account: t.varchar({ length: 100 }),
    synced_at: t.datetime(),
  },
  (table) => [t.index('idx_si_unit').on(table.unit)],
);
