import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';
import { opsTeams } from './opsTeams';
import { users } from './users';

export const opsTeamMembers = table(
  'ops_team_members',
  {
    id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    team_id: t
      .varchar({ length: 36 })
      .notNull()
      .references(() => opsTeams.id, { onDelete: 'cascade' }),
    user_id: t
      .varchar({ length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    created_at: t.timestamp().notNull().defaultNow(),
  },
  (table) => [t.uniqueIndex('uq_team_user').on(table.team_id, table.user_id)],
);
