import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';

export const opsTeams = table('ops_teams', {
  id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  team_key: t.varchar({ length: 50 }).unique().notNull(),
  team_name: t.varchar({ length: 100 }).notNull(),
  group_email: t.varchar({ length: 255 }),
  created_at: t.timestamp().notNull().defaultNow(),
  updated_at: t.timestamp().notNull().defaultNow().onUpdateNow(),
});
