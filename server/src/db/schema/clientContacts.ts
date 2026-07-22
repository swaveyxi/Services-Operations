import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';

export const clientContacts = table('client_contacts', {
  id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  qb_id: t.varchar({ length: 50 }).unique(),
  display_name: t.varchar({ length: 255 }).notNull(),
  company_name: t.varchar({ length: 255 }),
  abbreviation: t.varchar({ length: 20 }),
  email: t.varchar({ length: 255 }),
  phone: t.varchar({ length: 30 }),
  created_on: t.datetime(),
  synced_at: t.datetime(),
});
