import type { ClientContact } from '@shared/types';
import { api } from './api';

export async function getClientById(id: string): Promise<ClientContact | null> {
  try {
    const res = await api.get(`/clients/${encodeURIComponent(id)}`);
    return res.json();
  } catch {
    return null;
  }
}

/* Search — returns up to 20 matches; empty array for blank query. */
export async function listClients(query = ''): Promise<ClientContact[]> {
  if (!query.trim()) return [];
  const res = await api.get(`/clients?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function createClient(name: string, abbreviation: string): Promise<ClientContact> {
  const res = await api.post('/clients', {
    display_name: name.trim(),
    company_name: name.trim(),
    abbreviation: abbreviation.trim() || null,
  });
  return res.json();
}

export async function setClientAbbreviation(id: string, abbreviation: string): Promise<void> {
  await api.patch(`/clients/${encodeURIComponent(id)}`, { abbreviation });
}
