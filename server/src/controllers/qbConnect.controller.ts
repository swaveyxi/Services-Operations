import { Request, Response } from 'express';
import crypto from 'node:crypto';
import { getAuthorizationUrl, exchangeAuthorizationCode } from '../jobs/qbOAuth';
import { triggerManualSync } from '../jobs/qbSync';
import { getQbTokens } from '../models/qbTokens';

const STATE_COOKIE = 'qb_oauth_state';

// GET /api/quickbooks/connect — super_admin only. Redirects the browser to
// Intuit's consent screen; `state` round-trips via a short-lived cookie to
// guard against CSRF (a browser being tricked into authorizing someone
// else's QB company into our single-tenant qb_tokens row).
export function startConnect(_req: Request, res: Response): void {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000,
  });
  res.redirect(getAuthorizationUrl(state));
}

// GET /api/quickbooks/callback — Intuit redirects here; mounted outside
// verifyToken since this is a plain browser navigation from an external
// site, not an authenticated API call. Security is the state+realmId check,
// not our session.
export async function handleCallback(req: Request, res: Response): Promise<void> {
  const { code, realmId, state } = req.query as Record<string, string | undefined>;
  const expectedState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE);

  const redirectTo = (query: string) => res.redirect(`${process.env.APP_URL}/admin?tab=integrations&${query}`);

  if (!code || !state || state !== expectedState) {
    redirectTo('qb_error=invalid_state');
    return;
  }
  if (realmId !== process.env.QB_REALM_ID) {
    redirectTo('qb_error=wrong_company');
    return;
  }

  try {
    await exchangeAuthorizationCode(code);
    redirectTo('qb_connected=1');
  } catch (err) {
    console.error('[QB Connect] token exchange failed', err);
    redirectTo('qb_error=exchange_failed');
  }
}

// GET /api/quickbooks/status — super_admin only. Connection metadata for the
// Integrations tab; never returns the tokens themselves.
export async function getStatus(_req: Request, res: Response): Promise<void> {
  const row = await getQbTokens();
  res.json({
    connected: !!row,
    expires_at: row?.expires_at ?? null,
    last_polled_at: row?.last_polled_at ?? null,
    // Must be this exact origin (not a relative path) — the state cookie set
    // by /connect and read back by /callback only work if both requests hit
    // the same host as QB_REDIRECT_URI. A relative link would instead use
    // whatever origin the admin panel itself happens to be served from
    // (e.g. localhost:3000 in dev), which is a different cookie jar.
    connect_url: `${new URL(process.env.QB_REDIRECT_URI as string).origin}/api/quickbooks/connect`,
  });
}

// POST /api/quickbooks/sync — super_admin only. Manual "run sync now".
export async function triggerSync(_req: Request, res: Response): Promise<void> {
  const result = await triggerManualSync();
  res.json(result);
}
