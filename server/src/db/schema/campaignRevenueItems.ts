import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';
import { campaigns } from './campaigns';
import { serviceIncomes } from './serviceIncomes';
import { users } from './users';

export const campaignRevenueItems = table(
  'campaign_revenue_items',
  {
    id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    campaign_id: t
      .varchar({ length: 36 })
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    // Nullable: catalog entry may be removed; line item history is preserved.
    service_income_id: t
      .varchar({ length: 36 })
      .references(() => serviceIncomes.id, { onDelete: 'set null' }),
    // Snapshot fields — capture catalog values at selection time.
    service_name: t.varchar({ length: 255 }).notNull(),
    acct_num: t.varchar({ length: 20 }),
    parent_account: t.varchar({ length: 100 }),
    quantity: t.decimal({ precision: 10, scale: 2 }).notNull(),
    rate: t.decimal({ precision: 14, scale: 2 }).notNull(),
    // Audit trail — nullable: preserved if the acting user account is later deleted.
    created_by: t.varchar({ length: 36 }).references(() => users.id, { onDelete: 'set null' }),
    updated_by: t.varchar({ length: 36 }).references(() => users.id, { onDelete: 'set null' }),
    created_at: t.timestamp().notNull().defaultNow(),
    updated_at: t.timestamp().notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    t.index('idx_cri_campaign').on(table.campaign_id),
    t.uniqueIndex('uq_cri_campaign_acct').on(table.campaign_id, table.acct_num),
  ],
);
