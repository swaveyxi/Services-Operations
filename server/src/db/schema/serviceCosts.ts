import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';

// Sub-category is derived from acct_num on sync/seed insert — see subCategory() in
// server/src/utils/qbAccounts.ts for the authoritative range rules.
export const serviceCosts = table(
  'service_costs',
  {
    id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    qb_id: t.varchar({ length: 50 }).unique(),
    acct_num: t.varchar({ length: 20 }).unique().notNull(),
    unit: t.mysqlEnum(['Recruitment', 'Scholarships', 'Testing']).notNull(),
    sub_category: t.varchar({ length: 50 }),
    service: t.varchar({ length: 255 }).notNull(),
    parent_account: t.varchar({ length: 100 }),
    synced_at: t.datetime(),
  },
  (table) => [t.index('idx_sc_unit_sub').on(table.unit, table.sub_category)],
);
