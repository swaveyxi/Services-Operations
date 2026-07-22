import { api } from './api';

export type QbStatus = {
  connected: boolean;
  expires_at: string | null;
  last_polled_at: string | null;
  // Absolute URL (same origin as QB_REDIRECT_URI) — must be used as-is in a
  // plain <a href>, never as a relative path or via fetch. See the backend
  // comment in qbConnect.controller.ts for why.
  connect_url: string;
};

export async function getQbStatus(): Promise<QbStatus> {
  const res = await api.get('/quickbooks/status');
  return res.json();
}

export async function triggerQbSync(): Promise<{ ranSync: boolean }> {
  const res = await api.post('/quickbooks/sync', {});
  return res.json();
}
