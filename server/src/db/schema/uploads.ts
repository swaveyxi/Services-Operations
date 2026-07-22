import { mysqlTable as table } from 'drizzle-orm/mysql-core';
import * as t from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';
import { users } from './users';

export const uploads = table('uploads', {
  id: t.varchar({ length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  type: t.varchar({ length: 10 }).notNull(), // 'file' | 'link'
  name: t.varchar({ length: 255 }),
  url: t.text().notNull(),
  cloudinary_public_id: t.varchar({ length: 255 }), // populated after Cloudinary integration
  cloudinary_resource_type: t.varchar({ length: 50 }),
  uploaded_by: t.varchar({ length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  created_at: t.datetime().notNull().$defaultFn(() => new Date()),
});
