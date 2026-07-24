import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/database';
import { users } from '../db/schema';

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export async function findUserById(id: string): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return row ?? null;
}

export async function findAllUsers(): Promise<UserRow[]> {
  return db.select().from(users);
}

export async function findUsersByIds(ids: string[]): Promise<UserRow[]> {
  if (!ids.length) return [];
  return db.select().from(users).where(inArray(users.id, ids));
}

// Roles are stored as a JSON array — JSON_CONTAINS gives an exact element match.
export async function findUsersByRole(role: string): Promise<UserRow[]> {
  return db
    .select()
    .from(users)
    .where(sql`JSON_CONTAINS(${users.roles}, ${JSON.stringify(role)})`);
}

// Login-time upsert. `data.roles` is expected to already be the merged set —
// see verifyToken.ts, which combines the ERP JWT's org_roles claim (global
// roles like 'md'/'cloud', refreshed every login) with any locally-granted
// platform roles (super_admin/operations_admin, preserved across logins).
export async function upsertUser(data: UserInsert): Promise<void> {
  await db
    .insert(users)
    .values(data)
    .onDuplicateKeyUpdate({ set: { name: data.name, roles: data.roles } });
}

export async function updateUserRoles(id: string, roles: string[]): Promise<void> {
  await db.update(users).set({ roles }).where(eq(users.id, id));
}

export async function setUserActive(id: string, isActive: boolean): Promise<void> {
  await db.update(users).set({ is_active: isActive }).where(eq(users.id, id));
}
