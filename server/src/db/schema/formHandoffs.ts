import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';
import { supportForms } from './supportForms';
import type { OneDriveFile } from '../../../../shared/types';

export const formHandoffs = table(
  'jobs_handoffs',
  {
    id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    form_id: t
      .varchar({ length: 36 })
      .notNull()
      .references(() => supportForms.id, { onDelete: 'cascade' }),
    team: t.varchar({ length: 100 }).notNull(),
    status: t
      .mysqlEnum(['Pending', 'Acknowledged', 'Completed'])
      .notNull()
      .default('Pending'),
    sent_by: t.varchar({ length: 255 }).notNull(),
    sent_at: t.datetime().notNull(),
    auto: t.tinyint().notNull().default(0),
    attachment: t.json().$type<OneDriveFile[] | null>(),
    acknowledged_by: t.varchar({ length: 255 }),
    acknowledged_at: t.datetime(),
    completed_by: t.varchar({ length: 255 }),
    completed_at: t.datetime(),
    report: t.json().$type<OneDriveFile[] | null>(),
    reminders_sent: t.json().$type<string[]>().notNull().default([]),
    created_at: t.timestamp().notNull().defaultNow(),
    updated_at: t.timestamp().notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    t.index('idx_fho_form').on(table.form_id),
    t.index('idx_fho_team_status').on(table.team, table.status),
  ],
);
