import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';

export const parentAccounts = table('parent_accounts', {
  id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  qb_id: t.varchar({ length: 50 }).unique(),
  account_number: t.varchar({ length: 20 }).unique().notNull(),
  account_name: t.varchar({ length: 255 }).notNull(),
  account_type: t.varchar({ length: 50 }).notNull(),
  // Manual categorization tag — never written by sync, only by hand.
  service_type: t.varchar({ length: 50 }),
});
