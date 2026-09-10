/* Standalone fetch utility (not a hook). All service files use this so they can be
   called from both components and plain functions without violating hook rules. */
import { clearAuth, redirectToShell, DEV_BYPASS } from '@/auth/authBridge';

const BASE = '/api';

// Carries the HTTP status alongside the server's own message, so callers can
// tell "forbidden" (show the real reason) apart from "not found" or a network
// hiccup (fine to fall back to a generic message).
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (res.status === 401 && !DEV_BYPASS) {
    // No session, or the cookie's JWT expired/failed verification — the ERP
    // is the only place that can re-authenticate the user, so send them back
    // instead of leaving the app stuck showing a generic error.
    clearAuth();
    redirectToShell();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new ApiError(body?.error?.message ?? `HTTP ${res.status}`, res.status);
  }
  return res;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body: unknown) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: (path: string, body: unknown) =>
    request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path: string) => request(path, { method: 'DELETE' }),
};
