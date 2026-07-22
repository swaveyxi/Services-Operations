import { eq, like, or } from 'drizzle-orm';
import { db } from '../db/database';
import { clientContacts } from '../db/schema';

export type ClientRow = typeof clientContacts.$inferSelect;
export type ClientInsert = typeof clientContacts.$inferInsert;

export async function findClientById(id: string): Promise<ClientRow | null> {
  const [row] = await db
    .select()
    .from(clientContacts)
    .where(eq(clientContacts.id, id))
    .limit(1);
  return row ?? null;
}

export async function findClientByQbId(qbId: string): Promise<ClientRow | null> {
  const [row] = await db
    .select()
    .from(clientContacts)
    .where(eq(clientContacts.qb_id, qbId))
    .limit(1);
  return row ?? null;
}

export async function searchClients(query: string, limit = 20): Promise<ClientRow[]> {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(clientContacts)
    .where(
      or(
        like(clientContacts.display_name, pattern),
        like(clientContacts.company_name, pattern),
        like(clientContacts.abbreviation, pattern),
      ),
    )
    .limit(limit);
}

export async function createClient(data: ClientInsert): Promise<void> {
  await db.insert(clientContacts).values(data);
}

export async function updateClient(
  id: string,
  data: Partial<Pick<ClientInsert, 'abbreviation' | 'email' | 'phone'>>,
): Promise<void> {
  await db.update(clientContacts).set(data).where(eq(clientContacts.id, id));
}

export async function upsertClient(data: ClientInsert): Promise<void> {
  await db
    .insert(clientContacts)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        display_name: data.display_name,
        email: data.email,
        phone: data.phone,
        synced_at: data.synced_at,
      },
    });
}

export async function deleteClientByQbId(qbId: string): Promise<void> {
  await db.delete(clientContacts).where(eq(clientContacts.qb_id, qbId));
}
