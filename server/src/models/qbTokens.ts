import { eq } from 'drizzle-orm';
import { db } from '../db/database';
import { qbTokens } from '../db/schema';
import { encryptSecret, decryptSecret } from '../utils/encryptSecret';

export type QbTokensRow = typeof qbTokens.$inferSelect;

// access_token/refresh_token are encrypted at rest — this is the only place
// that reads/writes qb_tokens, so callers always see plaintext.

export async function getQbTokens(): Promise<QbTokensRow | null> {
  const [row] = await db.select().from(qbTokens).where(eq(qbTokens.id, 1)).limit(1);
  if (!row) return null;
  return {
    ...row,
    access_token: decryptSecret(row.access_token),
    refresh_token: decryptSecret(row.refresh_token),
  };
}

export async function updateQbTokens(
  fields: Partial<Omit<typeof qbTokens.$inferInsert, 'id'>>,
): Promise<void> {
  const toWrite = { ...fields };
  if (toWrite.access_token) toWrite.access_token = encryptSecret(toWrite.access_token);
  if (toWrite.refresh_token) toWrite.refresh_token = encryptSecret(toWrite.refresh_token);
  await db.update(qbTokens).set(toWrite).where(eq(qbTokens.id, 1));
}

type QbTokensWrite = {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  updated_at: Date;
};

// Full-row write, used by both the initial connect (no row exists yet) and
// the OAuth refresh path (row already exists) — same statement handles both.
export async function upsertQbTokens(fields: QbTokensWrite): Promise<void> {
  const toWrite = {
    id: 1,
    access_token: encryptSecret(fields.access_token),
    refresh_token: encryptSecret(fields.refresh_token),
    expires_at: fields.expires_at,
    updated_at: fields.updated_at,
  };
  await db
    .insert(qbTokens)
    .values(toWrite)
    .onDuplicateKeyUpdate({
      set: {
        access_token: toWrite.access_token,
        refresh_token: toWrite.refresh_token,
        expires_at: toWrite.expires_at,
        updated_at: toWrite.updated_at,
      },
    });
}
