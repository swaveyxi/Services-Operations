import { Request, Response } from 'express';
import { establishSession, devBypassUser } from '../services/authSession.service';
import { revokeUser } from '../services/revocation.service';

const COOKIE_NAME = 'erp_auth';

// GET /api/auth/session — the ERP backend owns cookie issuance now (see
// docs/ERP_Module-Tier_1.md); this module only ever reads the shared
// `.dragnet.ng` cookie it sets, never mints one itself. This is also where
// a first-seen user's local `users` row gets created/updated — the role
// merge (org_roles claim vs. locally-granted platform roles) + upsert used
// to run at POST-time session establishment; there's no POST anymore, so it
// runs here instead, on the boot-time session check.
export async function getSession(req: Request, res: Response): Promise<void> {
  if (process.env.DEV_BYPASS === 'true') {
    const user = await devBypassUser();
    if (!user) {
      res.status(500).json({ error: 'DEV_BYPASS user not found' });
      return;
    }
    res.json({ user: { id: user.id, name: user.name, email: user.email, roles: user.roles } });
    return;
  }

  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: 'No session' });
    return;
  }

  try {
    const { user } = await establishSession(token);
    res.json({ user: { id: user.id, name: user.name, email: user.email, roles: user.roles } });
  } catch {
    res.clearCookie(COOKIE_NAME);
    res.status(401).json({ error: 'Session expired' });
  }
}

// DELETE /api/auth/session — clears the cookie. Always allowed, even with an
// expired/invalid token — logout must never itself require a valid session.
export function deleteSession(_req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME);
  res.json({ message: 'Session ended.' });
}

// POST /api/auth/revoke — called by the ERP backend when this user's roles
// change. Public: authenticated by REVOKE_SECRET, not a session, since it's a
// server-to-server call. The next request from that user hits verifyToken's
// consumeRevocation() check and gets forced back through the ERP.
export function revokeSession(req: Request, res: Response): void {
  if (!process.env.REVOKE_SECRET) {
    res.status(500).json({ error: 'REVOKE_SECRET not configured' });
    return;
  }

  const { email, secret } = req.body;
  if (secret !== process.env.REVOKE_SECRET) {
    res.status(403).json({ error: 'Invalid secret' });
    return;
  }
  if (!email) {
    res.status(400).json({ error: 'Email required' });
    return;
  }

  revokeUser(String(email).trim().toLowerCase());
  res.json({ revoked: true });
}
