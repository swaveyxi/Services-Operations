import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';
import { campaigns } from './campaigns';
import { users } from './users';

export const supportForms = table(
  'support_forms',
  {
    id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    campaign_id: t
      .varchar({ length: 36 })
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    // Nullable: submitter record may be deleted; form history is preserved.
    submitter_user_id: t
      .varchar({ length: 36 })
      .references(() => users.id, { onDelete: 'set null' }),
    form_type: t.varchar({ length: 100 }).notNull(),
    // form_details is a JSON blob: field values + optional _handoff sub-object.
    form_details: t.json().$type<Record<string, unknown>>().notNull().default({}),
    delivery_status: t
      .mysqlEnum(['Submitted', 'Delivered', 'Acknowledged', 'Completed'])
      .notNull()
      .default('Submitted'),
    operations_team: t.varchar({ length: 50 }).notNull(),
    submitted_on: t.datetime(),
    created_at: t.timestamp().notNull().defaultNow(),
    updated_at: t.timestamp().notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    t.index('idx_sf_ops_team').on(table.operations_team, table.delivery_status),
    t.index('idx_sf_campaign').on(table.campaign_id),
  ],
);
