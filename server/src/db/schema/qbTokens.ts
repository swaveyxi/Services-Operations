import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';

// Single-row table. id is always 1, enforced at the application layer.
export const qbTokens = table('qb_tokens', {
  id: t.int().primaryKey().default(1),
  access_token: t.text().notNull(),
  refresh_token: t.text().notNull(),
  expires_at: t.datetime().notNull(),
  updated_at: t.datetime().notNull(),
  // Informational only — timestamp of the last completed poll (jobs/qbSync.ts),
  // shown in Admin > Integrations. Not used as a query cursor.
  last_polled_at: t.datetime(),
});
