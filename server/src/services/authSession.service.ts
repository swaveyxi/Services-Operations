/*
 * Shared JWT verification + role-merge logic behind the ERP auth session
 * (see docs/Dragnet_ERP_Authentication.md and controllers/auth.controller.ts,
 * middlewares/verifyToken.ts). Split out so both the login-time session
 * establishment and the per-request auth gate use the exact same
 * verification path.
 */
import jwt from 'jsonwebtoken';
import JwksClient from 'jwks-rsa';
import { randomUUID } from 'node:crypto';
import { PLATFORM_ROLES } from '@shared/constants';
import { upsertUser, findUserByEmail, type UserRow } from '../models/users';

const jwksClient = JwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000,
});

function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  jwksClient.getSigningKey(header.kid!, (err, key) => {
    callback(err, key?.getPublicKey());
  });
}

export function verifyJwt(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        audience: process.env.AZURE_CLIENT_ID,
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
        // A freshly-issued token's nbf/iat can be a second or two ahead of this
        // server's clock, which would otherwise fail verification on the very
        // first exchange (and force a needless bounce back through the ERP).
        clockTolerance: 10,
      },
      (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded as jwt.JwtPayload);
      },
    );
  });
}

// Trimmed + lowercased so a login never mints a second `users` row for
// someone whose token claim differs in case/whitespace from an existing
// record (e.g. one seeded by scripts/migrate-legacy-data.ts, which normalizes
// the same way when matching legacy submitter emails).
export function emailFromClaims(payload: jwt.JwtPayload): string {
  const raw = (payload['preferred_username'] as string) ?? (payload['email'] as string) ?? '';
  return raw.trim().toLowerCase();
}

function rolesFromClaims(payload: jwt.JwtPayload): string[] {
  const rawRoles = payload['org_roles'];
  return typeof rawRoles === 'string'
    ? rawRoles
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
    : Array.isArray(rawRoles)
      ? rawRoles
      : [];
}

/*
 * Verifies the JWT, merges its org_roles claim (global roles like md/cloud —
 * refreshed from the token every time this runs) with any locally-granted
 * platform roles (super_admin/operations_admin — preserved regardless of what
 * the token currently contains), and upserts the user record. Called once at
 * session establishment (POST /session), not on every request — it writes to
 * the DB, and per-request auth only needs a cheap read (see verifyToken.ts).
 */
export async function establishSession(token: string): Promise<{ user: UserRow; payload: jwt.JwtPayload }> {
  const payload = await verifyJwt(token);
  const email = emailFromClaims(payload);
  const name = (payload['name'] as string) ?? email;
  if (!email) throw new Error('Token missing email claim.');

  const jwtRoles = rolesFromClaims(payload);
  const existing = await findUserByEmail(email);
  const preservedPlatformRoles = (existing?.roles ?? []).filter((r) =>
    (PLATFORM_ROLES as readonly string[]).includes(r),
  );
  const roles = [...new Set([...jwtRoles, ...preservedPlatformRoles])];

  await upsertUser({ id: randomUUID(), email, name, roles });
  const user = await findUserByEmail(email);
  if (!user) throw new Error('User upsert failed.');
  return { user, payload };
}

export async function devBypassUser(): Promise<UserRow | null> {
  const email = process.env.DEV_BYPASS_EMAIL ?? 'admin@dragnet-solutions.com';
  return findUserByEmail(email);
}
