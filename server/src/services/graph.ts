// Microsoft Graph API — client credentials token cache + sendMail.
// DEV_BYPASS or missing Azure creds → console only, never throws.

// Prefer IPv4 for all DNS resolutions. Node 18+ (undici / Happy Eyeballs) tries every AAAA
// record in parallel; Microsoft endpoints return many IPv6 addresses that timeout when IPv6
// has no route, causing AggregateError [ETIMEDOUT] even though IPv4 is reachable.
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

type TokenCache = { token: string; expiresAt: number };
let _cache: TokenCache | null = null;

async function acquireToken(): Promise<string> {
  if (_cache && Date.now() < _cache.expiresAt - 5 * 60_000) return _cache.token;

  const { AZURE_TENANT_ID: tid, AZURE_CLIENT_ID: cid, AZURE_CLIENT_SECRET: secret } = process.env;
  if (!tid || !cid || !secret) throw new Error('[Graph] Azure credentials not configured');

  const res = await fetch(`https://login.microsoftonline.com/${tid}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: cid,
      client_secret: secret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });

  if (!res.ok) throw new Error(`[Graph] Token error: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  _cache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return _cache.token;
}

export async function graphSendMail(
  to: string[],
  subject: string,
  html: string,
): Promise<void> {
  const sender = process.env.GRAPH_SENDER_EMAIL;
  if (!sender) throw new Error('[Graph] GRAPH_SENDER_EMAIL is not set');

  const token = await acquireToken();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: to.map((a) => ({ emailAddress: { address: a } })),
          from: { emailAddress: { address: sender } },
        },
        saveToSentItems: false,
      }),
    },
  );

  if (res.status !== 202 && !res.ok) {
    throw new Error(`[Graph] sendMail error: ${res.status} ${await res.text()}`);
  }
}
