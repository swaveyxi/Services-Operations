import { eq } from 'drizzle-orm';
import { db } from '../db/database';
import { legacyAttachments } from '../db/schema';

export type LegacyAttachmentRow = typeof legacyAttachments.$inferSelect;

export async function findLegacyAttachmentById(id: string): Promise<LegacyAttachmentRow | null> {
  const [row] = await db.select().from(legacyAttachments).where(eq(legacyAttachments.id, id)).limit(1);
  return row ?? null;
}
