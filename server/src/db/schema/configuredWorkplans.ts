import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';
import { campaigns } from './campaigns';
import { users } from './users';

export const configuredWorkplans = table(
  'configured_workplans',
  {
    id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    campaign_id: t
      .varchar({ length: 36 })
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    template_id: t.varchar({ length: 100 }).notNull(),
    // template_name is stored here to preserve the name at configuration time.
    template_name: t.varchar({ length: 255 }).notNull(),
    status: t
      .mysqlEnum(['Draft', 'Submitted', 'Accepted', 'Amended', 'Pending Review'])
      .notNull()
      .default('Draft'),
    activities: t.json().$type<Record<string, unknown>[]>().notNull().default([]),
    ops_start_date: t.date(),
    ops_end_date: t.date(),
    // Audit trail — nullable: preserved if the acting user account is later deleted.
    created_by: t.varchar({ length: 36 }).references(() => users.id, { onDelete: 'set null' }),
    updated_by: t.varchar({ length: 36 }).references(() => users.id, { onDelete: 'set null' }),
    created_at: t.timestamp().notNull().defaultNow(),
    updated_at: t.timestamp().notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    t.index('idx_cw_campaign').on(table.campaign_id),
    t.uniqueIndex('uq_cw_campaign_template').on(table.campaign_id, table.template_id),
  ],
);
