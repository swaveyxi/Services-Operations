/*
 * ERP auth bridge (docs/Dragnet_ERP_Authentication.md) + a DEV_BYPASS short-circuit.
 * When VITE_DEV_BYPASS=true, the app skips ERP OAuth and reads the user from the
 * local server session (DB-backed). DEV_BYPASS is env-only — never a URL parameter.
 *
 * The JWT itself is never held in JS — it's handed to POST /api/auth/session
 * once, which validates it and sets it as an HttpOnly cookie; every request
 * after that relies on the browser sending that cookie (`credentials: 'include'`
 * in services/api.ts), never on a token read/stored here.
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

export async function checkAuthHash(): Promise<UserInfo | null> {
  if (!window.location.hash.includes('token=')) return null;
  const token = window.location.hash.split('token=')[1];
  if (!token) return null;
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  );

  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: token }),
    });
    if (!res.ok) return null;
    // The server's response is the validated, authoritative user info
    // (roles merged with any locally-granted platform roles) — not a
    // client-side JWT decode, which could never know about those.
    const userInfo = (await res.json()) as UserInfo;
    localStorage.setItem('erp_user', JSON.stringify(userInfo));
    return userInfo;
  } catch {
    return null;
  }
}

export function getStoredAuth(): UserInfo | null {
  const raw = localStorage.getItem('erp_user');
  if (!raw) return null;
  try {
    const info = JSON.parse(raw) as UserInfo;
    if (info.expiresOn && Date.now() > info.expiresOn) {
      localStorage.removeItem('erp_user');
      return null;
    }
    return info;
  } catch {
    localStorage.removeItem('erp_user');
    return null;
  }
}

export async function verifySession(): Promise<UserInfo | null> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: { id?: string; name: string; email: string; roles: string[] } };
    if (!data?.user?.email) return null;
    const userInfo: UserInfo = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      roles: data.user.roles,
    };
    localStorage.setItem('erp_user', JSON.stringify(userInfo));
    return userInfo;
  } catch {
    return null;
  }
}

export function redirectToShell(): void {
  const currentUrl = window.location.href.split('#')[0];
  window.location.href = `${SHELL_URL}?redirect=${encodeURIComponent(currentUrl)}`;
}

export function clearAuth(): void {
  localStorage.removeItem('erp_user');
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
