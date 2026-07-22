import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';

// Mirrors Dataverse's annotation entity for files migrated off the old
// Power Pages app — content is the base64 documentbody, served back through
// GET /api/legacy-uploads/:id (auth-gated, unlike a public static file).
export const legacyAttachments = table('legacy_attachments', {
  id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  annotation_id: t.varchar({ length: 36 }).unique().notNull(),
  filename: t.varchar({ length: 255 }).notNull(),
  mime_type: t.varchar({ length: 255 }),
  size_bytes: t.int(),
  content: t.longtext().notNull(),
  created_at: t.timestamp().notNull().defaultNow(),
});
