import { Request, Response } from 'express';
import { establishSession, verifyJwt, emailFromClaims, devBypassUser } from '../services/authSession.service';
import { findUserByEmail } from '../models/users';

const COOKIE_NAME = 'erp_auth';

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: Math.max(maxAgeMs, 0),
    path: '/',
  };
}

// POST /api/auth/session — validates the ERP-issued JWT and starts a session.
// Public: establishing a session can't require already having one.
export async function createSession(req: Request, res: Response): Promise<void> {
  const { accessToken } = req.body;
  if (!accessToken) {
    res.status(400).json({ error: 'No token provided' });
    return;
  }

  try {
    const { user, payload } = await establishSession(accessToken);
    const expiresOn = ((payload.exp as number) ?? 0) * 1000;
    res.cookie(COOKIE_NAME, accessToken, cookieOptions(expiresOn - Date.now()));
    res.json({ id: user.id, name: user.name, email: user.email, roles: user.roles, expiresOn });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// GET /api/auth/session — verifies the existing cookie (or the DEV_BYPASS user).
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
    const payload = await verifyJwt(token);
    const user = await findUserByEmail(emailFromClaims(payload));
    if (!user) {
      res.clearCookie(COOKIE_NAME);
      res.status(401).json({ error: 'No session' });
      return;
    }
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
