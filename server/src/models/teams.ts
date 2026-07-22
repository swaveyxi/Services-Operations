import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '../db/database';
import { opsTeams, opsTeamMembers, users } from '../db/schema';

export type TeamRow = typeof opsTeams.$inferSelect;
export type TeamMemberRow = typeof opsTeamMembers.$inferSelect;

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function findAllTeams(): Promise<TeamRow[]> {
  return db.select().from(opsTeams);
}

export async function findTeamByKey(teamKey: string): Promise<TeamRow | null> {
  const [row] = await db
    .select()
    .from(opsTeams)
    .where(eq(opsTeams.team_key, teamKey))
    .limit(1);
  return row ?? null;
}

export async function findTeamByName(teamName: string): Promise<TeamRow | null> {
  const [row] = await db
    .select()
    .from(opsTeams)
    .where(eq(opsTeams.team_name, teamName))
    .limit(1);
  return row ?? null;
}

export async function updateGroupEmail(teamKey: string, email: string | null): Promise<void> {
  await db
    .update(opsTeams)
    .set({ group_email: email })
    .where(eq(opsTeams.team_key, teamKey));
}

export async function createTeam(teamKey: string, teamName: string): Promise<TeamRow> {
  const id = randomUUID();
  await db.insert(opsTeams).values({ id, team_key: teamKey, team_name: teamName });
  return (await findTeamByKey(teamKey))!;
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function findTeamMembers(
  teamKey: string,
): Promise<Array<{ id: string; name: string; email: string; roles: string[] }>> {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roles: users.roles,
    })
    .from(opsTeamMembers)
    .innerJoin(opsTeams, eq(opsTeamMembers.team_id, opsTeams.id))
    .innerJoin(users, eq(opsTeamMembers.user_id, users.id))
    .where(eq(opsTeams.team_key, teamKey));
}

export async function findTeamsByUser(
  userId: string,
): Promise<Array<{ team_key: string; team_name: string }>> {
  return db
    .select({ team_key: opsTeams.team_key, team_name: opsTeams.team_name })
    .from(opsTeamMembers)
    .innerJoin(opsTeams, eq(opsTeamMembers.team_id, opsTeams.id))
    .where(eq(opsTeamMembers.user_id, userId));
}

export async function addTeamMember(teamId: string, userId: string): Promise<void> {
  await db
    .insert(opsTeamMembers)
    .values({ id: randomUUID(), team_id: teamId, user_id: userId })
    .onDuplicateKeyUpdate({ set: { team_id: teamId } });
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  await db
    .delete(opsTeamMembers)
    .where(and(eq(opsTeamMembers.team_id, teamId), eq(opsTeamMembers.user_id, userId)));
}
