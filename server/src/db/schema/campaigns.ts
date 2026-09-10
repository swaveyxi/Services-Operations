import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';
import { clientContacts } from './clientContacts';
import { users } from './users';

export const campaigns = table(
  'campaigns',
  {
    id: t
      .varchar({ length: 36 })
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    // Human-readable business key: "7UP/JUN/2026". Used for display and dedup only.
    campaign_id: t.varchar({ length: 30 }).unique().notNull(),
    // Nullable: client deletion sets this to NULL; campaign record is preserved.
    client_id: t
      .varchar({ length: 36 })
      .references(() => clientContacts.id, { onDelete: 'set null' }),
    owner_user_id: t
      .varchar({ length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    unit: t.mysqlEnum(['Recruitment', 'Scholarships', 'Testing']).notNull(),
    // Human-readable campaign name, e.g. "MTN Scholarships 2026" — distinct
    // from campaign_id (the generated business key) and description (free
    // text). Nullable so pre-existing rows aren't broken by the migration;
    // required going forward via CreateCampaignSchema.
    name: t.varchar({ length: 255 }),
    description: t.text(),
    campaign_status: t
      .mysqlEnum(['Draft', 'Workplan', 'Profitability', 'Active', 'Closed'])
      .notNull()
      .default('Draft'),
    approval_status: t.mysqlEnum(['Pending', 'Approved', 'Rejected']),
    approval_note: t.text(),
    approved_by: t.varchar({ length: 255 }),
    created_at: t.timestamp().notNull().defaultNow(),
    updated_at: t.timestamp().notNull().defaultNow().onUpdateNow(),
  },
  (table) => [t.index('idx_c_owner_status').on(table.owner_user_id, table.campaign_status)],
);
