import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';

export const users = table('users', {
  id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  email: t.varchar({ length: 255 }).unique().notNull(),
  name: t.varchar({ length: 255 }).notNull(),
  roles: t.json().$type<string[]>().notNull().default([]),
  is_active: t.boolean().notNull().default(true),
  created_at: t.timestamp().notNull().defaultNow(),
  updated_at: t.timestamp().notNull().defaultNow().onUpdateNow(),
});
