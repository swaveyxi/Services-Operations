import { getQbTokens, upsertQbTokens } from '../models/qbTokens';

const TOKEN_ENDPOINT = process.env.QB_TOKEN_ENDPOINT as string;

type QbTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

function isWithin5Min(expiresAt: Date): boolean {
  return expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
}

async function requestTokens(body: URLSearchParams): Promise<QbTokenResponse> {
  const basicAuth = Buffer.from(
    `${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`,
  ).toString('base64');

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`[QB OAuth] token request failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<QbTokenResponse>;
}

async function persistTokens(fresh: QbTokenResponse): Promise<void> {
  await upsertQbTokens({
    access_token: fresh.access_token,
    refresh_token: fresh.refresh_token,
    expires_at: new Date(Date.now() + fresh.expires_in * 1000),
    updated_at: new Date(),
  });
}

// Builds the URL an admin's browser is redirected to for the initial QB consent screen.
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.QB_CLIENT_ID as string,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: process.env.QB_REDIRECT_URI as string,
    state,
  });
  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
}

// First-time connect — exchanges the authorization code from the callback for
// the first access_token/refresh_token pair and inserts the qb_tokens row.
export async function exchangeAuthorizationCode(code: string): Promise<void> {
  const fresh = await requestTokens(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.QB_REDIRECT_URI as string,
    }),
  );
  await persistTokens(fresh);
}

// QB rotates the refresh token on every use — the rotated value must be
// persisted immediately or the next refresh will fail.
export async function getAccessToken(): Promise<string> {
  const row = await getQbTokens();
  if (!row) {
    throw new Error('[QB OAuth] qb_tokens row not found — connect QuickBooks first');
  }

  if (!isWithin5Min(row.expires_at)) {
    return row.access_token;
  }

  const fresh = await requestTokens(
    new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token }),
  );
  await persistTokens(fresh);
  return fresh.access_token;
}
