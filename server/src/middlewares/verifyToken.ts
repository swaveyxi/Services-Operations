import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import jwt from 'jsonwebtoken';
import { verifyJwt, emailFromClaims, devBypassUser } from '../services/authSession.service';
import { findUserByEmail } from '../models/users';

const COOKIE_NAME = 'erp_auth';

// Per-request auth gate. Only re-verifies the cookie's JWT signature/expiry
// and does a cheap DB lookup by email — the role merge + upsert (org_roles
// claim vs. locally-granted platform roles) happens once, at session
// establishment (see controllers/auth.controller.ts's createSession), not on
// every request.
export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  // DEV_BYPASS: skip the cookie/JWT entirely, inject mock user from DB
  if (process.env.DEV_BYPASS === 'true') {
    const user = await devBypassUser();
    if (!user) throw createError(500, 'DEV_BYPASS user not found');
    req.user = { id: user.id, email: user.email, name: user.name, roles: user.roles };
    return next();
  }

  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw createError(401, 'No session.');

  try {
    const payload = await verifyJwt(token);
    const email = emailFromClaims(payload);
    if (!email) throw createError(401, 'Token missing email claim.');

    const user = await findUserByEmail(email);
    if (!user) throw createError(401, 'No session.');

    req.user = { id: user.id, email: user.email, name: user.name, roles: user.roles };
    next();
  } catch (err) {
    res.clearCookie(COOKIE_NAME);
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      throw createError(401, 'Invalid or expired token.');
    }
    throw err;
  }
}
