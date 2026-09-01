/*
 * In-memory revocation blocklist (docs/ERP_Module-Tier_1.md, Step 4/5). The
 * ERP backend calls POST /api/auth/revoke when a user's roles change;
 * verifyToken.ts consumes the entry on that user's next request, forcing
 * them back through the ERP for a fresh token. Entries also auto-clear after
 * 2 hours — by then the underlying JWT will have expired anyway.
 */
const revokedUsers = new Set<string>();
const REVOCATION_TTL_MS = 2 * 60 * 60 * 1000;

export function revokeUser(email: string): void {
  revokedUsers.add(email);
  setTimeout(() => revokedUsers.delete(email), REVOCATION_TTL_MS);
}

// Single-use check: clears the entry so the user isn't stuck revoked forever
// once they've been forced to re-authenticate once.
export function consumeRevocation(email: string): boolean {
  const revoked = revokedUsers.has(email);
  if (revoked) revokedUsers.delete(email);
  return revoked;
}
