// Thin wrapper over Core Atlas's real HTTP API (a separately-deployed
// service — see docs/Atlas_API_doc.md). Every route there responds with the
// same {success, data, meta?} / {success: false, error} envelope; this is
// the one place that unwraps it, so every caller in atlas.service.ts only
// ever sees `data`/`meta`.

export class AtlasApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type AtlasMeta = { page: number; limit: number; total: number; totalPages: number };
type AtlasEnvelope<T> =
  | { success: true; data: T; meta?: AtlasMeta }
  | { success: false; error: { code: string; message: string; fields?: Record<string, string[]> } };

function apiBase(): string {
  const base = process.env.CORE_ATLAS_API_URL;
  if (!base) throw new Error('[Config] CORE_ATLAS_API_URL is not set.');
  return base;
}

function serviceKey(): string {
  const key = process.env.CORE_ATLAS_SERVICE_KEY;
  if (!key) throw new Error('[Config] CORE_ATLAS_SERVICE_KEY is not set.');
  return key;
}

async function atlasFetch<T>(path: string, init: RequestInit = {}): Promise<{ data: T; meta?: AtlasMeta }> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      'X-Service-Key': serviceKey(),
      accept: 'application/json',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json()) as AtlasEnvelope<T>;
  if (!body.success) {
    throw new AtlasApiError(res.status, body.error.code, body.error.message);
  }
  return { data: body.data, meta: body.meta };
}

export async function atlasGet<T>(path: string): Promise<{ data: T; meta?: AtlasMeta }> {
  return atlasFetch<T>(path, { method: 'GET' });
}

export async function atlasPost<T>(path: string, body: unknown): Promise<{ data: T }> {
  return atlasFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function atlasDelete<T>(path: string): Promise<{ data: T }> {
  return atlasFetch<T>(path, { method: 'DELETE' });
}

// The report-export endpoint is the one Atlas route that returns a raw file
// instead of the JSON envelope — callers stream this through, not `.json()` it.
export async function atlasGetRaw(
  path: string,
): Promise<{ ok: boolean; status: number; contentType: string | null; contentDisposition: string | null; body: ArrayBuffer }> {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { 'X-Service-Key': serviceKey() },
  });
  return {
    ok: res.ok,
    status: res.status,
    contentType: res.headers.get('content-type'),
    contentDisposition: res.headers.get('content-disposition'),
    body: await res.arrayBuffer(),
  };
}
