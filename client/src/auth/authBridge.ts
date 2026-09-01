/*
 * ERP auth bridge (docs/ERP_Module-Tier_1.md) + a DEV_BYPASS short-circuit.
 * When VITE_DEV_BYPASS=true, the app skips the ERP redirect and reads the
 * user from the local server session (DB-backed). DEV_BYPASS is env-only —
 * never a URL parameter.
 *
 * The ERP backend is the sole authority on the shared `erp_auth` cookie —
 * it validates the MSAL token and sets the HttpOnly cookie itself, then
 * redirects back here with no token in the URL. This app never sees or
 * holds the JWT; it only ever asks the server to verify the cookie
 * (`credentials: 'include'`, see services/api.ts) via GET /api/auth/session.
 */
import type { UserInfo } from '@shared/types';

const SHELL_URL = import.meta.env.VITE_DRAGNET_ERP_URL ?? '';
export const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS === 'true';

export async function getDevSessionUser(): Promise<UserInfo | null> {
  if (!DEV_BYPASS) return null;
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: { id: string; name: string; email: string; roles: string[] } };
    if (!data?.user?.email) return null;
    return {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      roles: data.user.roles.map((r) => r.toLowerCase()),
      expiresOn: Date.now() + 3_600_000,
    };
  } catch {
    return null;
  }
}

// Verifies the `erp_auth` cookie against the server on every boot — no
// client-side caching. Caching this would risk missing a revoked/expired
// session (see POST /api/auth/revoke) until some other request happened to
// hit a 401.
export async function verifySession(): Promise<UserInfo | null> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: { id?: string; name: string; email: string; roles: string[] } };
    if (!data?.user?.email) return null;
    return {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      roles: data.user.roles,
    };
  } catch {
    return null;
  }
}

export function redirectToShell(): void {
  const currentUrl = window.location.href.split('#')[0];
  window.location.href = `${SHELL_URL}?redirect=${encodeURIComponent(currentUrl)}`;
}

export function clearAuth(): void {
  fetch('/api/auth/session', {
    method: 'DELETE',
    credentials: 'include',
  }).catch(() => {});
}

export function logoutToShell(): void {
  if (DEV_BYPASS) {
    clearAuth();
    return;
  }
  clearAuth();
  window.location.href = `${SHELL_URL}/logout`;
}
