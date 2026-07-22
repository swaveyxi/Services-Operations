import crypto from 'crypto';

export async function verifySignature(
  rawBody: string | Buffer,
  signature: string,
  verifierToken: string,
) {
  const hash = crypto.createHmac('sha256', verifierToken).update(rawBody).digest('base64');
  return hash === signature;
}

// ─── QBO API client ───────────────────────────────────────────────────────────
// Thin wrapper over the QuickBooks Online REST API, shared by the daily
// polling job (jobs/qbSync.ts) and the webhook handler (controllers/qbWebhook.controller.ts).

export type QbAccount = {
  Id: string;
  Name: string;
  AcctNum?: string;
  Active?: boolean;
  // false = top-level/parent grouping account, true = leaf/sub-account.
  // The definitive signal for routing — don't infer this from AcctNum.
  SubAccount?: boolean;
  AccountType?: string;
};

export type QbCustomer = {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  Job?: boolean;
  Active?: boolean;
  PrimaryEmailAddr?: { Address?: string };
  PrimaryPhone?: { FreeFormNumber?: string };
  MetaData?: { CreateTime?: string };
};

function apiBase(): string {
  return `${process.env.QB_URI}/v3/company/${process.env.QB_REALM_ID}`;
}

async function qbFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`[QBO API] ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export async function getAccount(accessToken: string, id: string): Promise<QbAccount> {
  const body = await qbFetch<{ Account: QbAccount }>(`/account/${id}`, accessToken);
  return body.Account;
}

export async function getCustomer(accessToken: string, id: string): Promise<QbCustomer> {
  const body = await qbFetch<{ Customer: QbCustomer }>(`/customer/${id}`, accessToken);
  return body.Customer;
}

const PAGE_SIZE = 1000;

type QueryResponseBody<T> = { QueryResponse?: Record<string, unknown> & { [key: string]: T[] | undefined } };

async function queryAllOf<T>(accessToken: string, entity: 'Account' | 'Customer'): Promise<T[]> {
  const all: T[] = [];
  let startPosition = 1;

  // Paginate until a page comes back smaller than requested — no cap on
  // total results, only on the log line below.
  for (;;) {
    const query = `select * from ${entity} STARTPOSITION ${startPosition} MAXRESULTS ${PAGE_SIZE}`;
    const body = await qbFetch<QueryResponseBody<T>>(
      `/query?query=${encodeURIComponent(query)}`,
      accessToken,
    );
    const page = body.QueryResponse?.[entity] ?? [];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    startPosition += PAGE_SIZE;
  }
  return all;
}

// Full listing, not a delta — the daily poll's job is "insert whatever QBO
// has that we don't," regardless of whether QBO considers it "changed."
export async function queryAllAccountsAndCustomers(
  accessToken: string,
): Promise<{ accounts: QbAccount[]; customers: QbCustomer[] }> {
  const [accounts, customers] = await Promise.all([
    queryAllOf<QbAccount>(accessToken, 'Account'),
    queryAllOf<QbCustomer>(accessToken, 'Customer'),
  ]);
  return { accounts, customers };
}
