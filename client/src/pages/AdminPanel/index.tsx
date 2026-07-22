import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  listUsers,
  grantRole,
  revokeRole,
  listTeamMembers,
  addTeamMember,
  removeTeamMember,
  getTeamGroupEmail,
  setTeamGroupEmail,
  clearTeamGroupEmail,
  createTeam,
  PLATFORM_ROLES,
  type PlatformRole,
  getQbStatus,
  triggerQbSync,
  type QbStatus,
} from '@/services';
import { TEAMS } from '@/services/teams';
import { useServiceCall } from '@/hooks/useServiceCall';
import { useToast } from '@/context/ToastContext';
import { SUPER_ADMIN_ROLE } from '@shared/constants';
import type { OpsUser } from '@shared/types';
import s from './AdminPanel.module.css';

type Tab = 'roles' | 'teams' | 'integrations';

export default function AdminPanel() {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole(SUPER_ADMIN_ROLE);

  if (!isSuperAdmin) {
    return (
      <>
        <div className='page-head'>
          <div>
            <h1 className='page-title'>Admin Panel</h1>
          </div>
        </div>
        <div className='empty-state'>You do not have access to this section.</div>
      </>
    );
  }

  return (
    <>
      <div className='page-head'>
        <div>
          <h1 className='page-title'>Admin Panel</h1>
          <p className='page-sub'>Manage platform roles and team membership.</p>
        </div>
      </div>
      <AdminContent />
    </>
  );
}

function AdminContent() {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'roles';
  const [tab, setTab] = useState<Tab>(initialTab === 'integrations' ? 'integrations' : 'roles');

  return (
    <>
      <div className={s.tabs}>
        <button
          className={`${s.tab} ${tab === 'roles' ? s.active : ''}`}
          onClick={() => setTab('roles')}
        >
          <i className='fa-solid fa-shield-halved' aria-hidden='true' /> Platform Roles
        </button>
        <button
          className={`${s.tab} ${tab === 'teams' ? s.active : ''}`}
          onClick={() => setTab('teams')}
        >
          <i className='fa-solid fa-people-group' aria-hidden='true' /> Team Membership
        </button>
        <button
          className={`${s.tab} ${tab === 'integrations' ? s.active : ''}`}
          onClick={() => setTab('integrations')}
        >
          <i className='fa-solid fa-plug' aria-hidden='true' /> Integrations
        </button>
      </div>
      {tab === 'roles' ? <RolesPanel /> : tab === 'teams' ? <TeamsPanel /> : <IntegrationsPanel />}
    </>
  );
}

function IntegrationsPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast, showError } = useToast();
  const [busy, call] = useServiceCall();
  const [status, setStatus] = useState<QbStatus | null>(null);

  useEffect(() => {
    getQbStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  /* Surface the callback redirect's result once, then strip it from the URL. */
  useEffect(() => {
    const connected = searchParams.get('qb_connected');
    const error = searchParams.get('qb_error');
    if (!connected && !error) return;

    if (connected) showToast('QuickBooks connected successfully.', 'success');
    if (error) showError(`QuickBooks connection failed: ${error.replace(/_/g, ' ')}`);

    const next = new URLSearchParams(searchParams);
    next.delete('qb_connected');
    next.delete('qb_error');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, showToast, showError]);

  async function handleSync() {
    const result = await call(() => triggerQbSync());
    if (result?.ranSync === false) {
      showError('A sync is already running — try again shortly.');
    } else if (result?.ranSync) {
      showToast('QuickBooks sync completed.', 'success');
    }
    getQbStatus().then(setStatus).catch(() => {});
  }

  return (
    <div className={s.teamPanel}>
      <div className={s.teamPanelHead}>
        <i className='fa-solid fa-plug' aria-hidden='true' />
        QuickBooks
      </div>

      <div className={s.teamPanelBody}>
        {status === null ? (
          <div className='loading-state'>Loading…</div>
        ) : (
          <>
            <p className='muted' style={{ fontSize: '0.85rem' }}>
              Status: {status.connected ? 'Connected' : 'Not connected'}
            </p>
            {status.connected && (
              <>
                <p className='muted' style={{ fontSize: '0.85rem' }}>
                  Token expires: {status.expires_at ? new Date(status.expires_at).toLocaleString() : '—'}
                </p>
                <p className='muted' style={{ fontSize: '0.85rem' }}>
                  Last synced: {status.last_polled_at ? new Date(status.last_polled_at).toLocaleString() : 'never'}
                </p>
              </>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'var(--space-3)' }}>
              <a className='btn btn-primary btn-sm' href={status.connect_url}>
                <i className='fa-solid fa-plug' aria-hidden='true' />{' '}
                {status.connected ? 'Reconnect' : 'Connect'} QuickBooks
              </a>
              <button
                className='btn btn-secondary btn-sm'
                disabled={busy || !status.connected}
                onClick={handleSync}
              >
                <i className='fa-solid fa-rotate' aria-hidden='true' /> Run sync now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RolesPanel() {
  const [busy, call] = useServiceCall();
  const [users, setUsers] = useState<OpsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    listUsers().then((u) => { setUsers(u); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const n = q.toLowerCase().trim();
    return n ? users.filter((u) => u.name.toLowerCase().includes(n) || u.email.toLowerCase().includes(n)) : users;
  }, [users, q]);

  async function toggle(user: OpsUser, role: PlatformRole) {
    const has = user.roles.includes(role);
    const updated = await call(() => has ? revokeRole(user.email, role) : grantRole(user.email, role));
    if (updated) setUsers((prev) => prev.map((u) => u.email === updated.email ? updated : u));
  }

  if (loading) return <div className='loading-state'>Loading users…</div>;

  return (
    <>
      <input
        className={`input ${s.searchBar}`}
        placeholder='Search by name or email…'
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {filtered.length === 0 ? (
        <div className='empty-state'>No users match your search.</div>
      ) : (
        filtered.map((u) => (
          <div key={u.email} className={s.userRow}>
            <div className={s.avatar}>{initials(u.name)}</div>
            <div className={s.userInfo}>
              <div className={s.userName}>{u.name}</div>
              <div className={s.userEmail}>{u.email}</div>
            </div>
            <div className={s.rolePills}>
              {u.roles.map((r) => (
                <span key={r} className={`${s.pill} ${PLATFORM_ROLES.includes(r as PlatformRole) ? s.platform : ''}`}>
                  {r}
                </span>
              ))}
            </div>
            <div className={s.roleActions}>
              {PLATFORM_ROLES.map((role) => {
                const has = u.roles.includes(role);
                return (
                  <button
                    key={role}
                    className={`btn btn-sm ${has ? 'btn-secondary' : 'btn-ghost'}`}
                    disabled={busy}
                    onClick={() => toggle(u, role)}
                    title={has ? `Revoke ${role}` : `Grant ${role}`}
                  >
                    <i className={`fa-solid ${has ? 'fa-minus' : 'fa-plus'}`} aria-hidden='true' />{' '}
                    {shortRole(role)}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </>
  );
}

function TeamsPanel() {
  const [busy, call] = useServiceCall();
  const [selectedKey, setSelectedKey] = useState(TEAMS[0]?.key ?? '');
  const [members, setMembers] = useState<Record<string, string[]>>({});
  const [groupEmails, setGroupEmails] = useState<Record<string, string | null>>({});
  const [missingTeams, setMissingTeams] = useState<Set<string>>(new Set());
  const [groupDraft, setGroupDraft] = useState('');
  const [editingGroup, setEditingGroup] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [allUsers, setAllUsers] = useState<OpsUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const addWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listUsers().then(setAllUsers);
  }, []);

  useEffect(() => {
    if (!selectedKey) return;
    if (members[selectedKey] === undefined) {
      listTeamMembers(selectedKey)
        .then((m) => setMembers((prev) => ({ ...prev, [selectedKey]: m })))
        .catch(() => {
          setMembers((prev) => ({ ...prev, [selectedKey]: [] }));
          setMissingTeams((prev) => new Set(prev).add(selectedKey));
        });
    }
    if (!(selectedKey in groupEmails)) {
      getTeamGroupEmail(selectedKey)
        .then((e) => setGroupEmails((prev) => ({ ...prev, [selectedKey]: e })))
        .catch(() => setGroupEmails((prev) => ({ ...prev, [selectedKey]: null })));
    }
  }, [selectedKey, members, groupEmails]);

  /* Reset draft input when switching teams. */
  useEffect(() => {
    setEditingGroup(false);
    setGroupDraft('');
    setNewEmail('');
    setShowSuggestions(false);
    setHighlightIndex(-1);
  }, [selectedKey]);

  /* Close suggestion dropdown on outside click. */
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (addWrapRef.current && !addWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const current = members[selectedKey] ?? [];
  const groupEmail = groupEmails[selectedKey] ?? null;

  const nameFor = (email: string) =>
    allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase())?.name ?? '';

  const suggestions = useMemo(() => {
    const q = newEmail.toLowerCase().trim();
    if (!q) return [];
    return allUsers.filter(
      (u) =>
        !current.includes(u.email) &&
        (u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [newEmail, allUsers, current]);

  async function handleAdd(emailOverride?: string) {
    const trimmed = (emailOverride ?? newEmail).trim();
    if (!trimmed) return;
    setShowSuggestions(false);
    setHighlightIndex(-1);
    const result = await call(() => addTeamMember(selectedKey, trimmed));
    if (result) {
      setMembers((prev) => ({ ...prev, [selectedKey]: result }));
      setNewEmail('');
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') handleAdd();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0) handleAdd(suggestions[highlightIndex].email);
      else handleAdd();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightIndex(-1);
    }
  }

  async function handleRemove(email: string) {
    const result = await call(() => removeTeamMember(selectedKey, email));
    if (result !== null) setMembers((prev) => ({ ...prev, [selectedKey]: result }));
  }

  async function handleSaveGroup() {
    const trimmed = groupDraft.trim();
    if (!trimmed) return;
    const result = await call(() => setTeamGroupEmail(selectedKey, trimmed));
    if (result) {
      setGroupEmails((prev) => ({ ...prev, [selectedKey]: result }));
      setEditingGroup(false);
      setGroupDraft('');
    }
  }

  async function handleClearGroup() {
    await call(() => clearTeamGroupEmail(selectedKey));
    setGroupEmails((prev) => ({ ...prev, [selectedKey]: null }));
    setEditingGroup(false);
    setGroupDraft('');
  }

  async function handleCreateTeam() {
    if (!selectedTeam) return;
    const result = await call(() => createTeam(selectedTeam.key, selectedTeam.name));
    if (result === null) return;
    setMissingTeams((prev) => {
      const next = new Set(prev);
      next.delete(selectedTeam.key);
      return next;
    });
    setMembers((prev) => ({ ...prev, [selectedTeam.key]: [] }));
    setGroupEmails((prev) => ({ ...prev, [selectedTeam.key]: null }));
  }

  const selectedTeam = TEAMS.find((t) => t.key === selectedKey);

  return (
    <div className={s.teamLayout}>
      <div className={s.teamList}>
        {TEAMS.map((t) => (
          <div
            key={t.key}
            className={`${s.teamItem} ${t.key === selectedKey ? s.selected : ''}`}
            onClick={() => setSelectedKey(t.key)}
          >
            <i className={`fa-solid ${t.icon}`} aria-hidden='true' />
            {t.name}
            <span className={s.teamCount}>
              {members[t.key]?.length ?? '—'}
            </span>
          </div>
        ))}
      </div>

      <div className={s.teamPanel}>
        <div className={s.teamPanelHead}>
          {selectedTeam && (
            <i className={`fa-solid ${selectedTeam.icon}`} aria-hidden='true' />
          )}
          {selectedTeam?.name ?? 'Select a team'}
          <span className='muted' style={{ fontWeight: 400, fontSize: '0.8rem', marginLeft: 4 }}>
            {current.length} {current.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        {selectedKey && missingTeams.has(selectedKey) ? (
          <div className={s.teamPanelBody}>
            <p className='muted' style={{ fontSize: '0.85rem' }}>
              This team hasn't been set up yet — it has no group email or members until it's created.
            </p>
            <div>
              <button className='btn btn-primary btn-sm' disabled={busy} onClick={handleCreateTeam}>
                <i className='fa-solid fa-plus' aria-hidden='true' /> Create Team
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={s.groupEmailRow}>
              <i className='fa-solid fa-envelope' aria-hidden='true' style={{ color: 'var(--c-text-faint)', flexShrink: 0 }} />
              {editingGroup ? (
                <>
                  <input
                    className={`input ${s.groupInput}`}
                    placeholder='team-group@dragnet-solutions.com'
                    value={groupDraft}
                    onChange={(e) => setGroupDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGroup(); if (e.key === 'Escape') setEditingGroup(false); }}
                    autoFocus
                  />
                  <button className='btn btn-primary btn-sm' disabled={busy || !groupDraft.trim()} onClick={handleSaveGroup}>
                    Save
                  </button>
                  <button className='btn btn-ghost btn-sm' onClick={() => setEditingGroup(false)}>Cancel</button>
                </>
              ) : (
                <>
                  {groupEmail ? (
                    <>
                      <span className={s.groupEmailValue}>{groupEmail}</span>
                      <button
                        className='btn btn-ghost btn-sm'
                        onClick={() => { setGroupDraft(groupEmail); setEditingGroup(true); }}
                        title='Edit group email'
                      >
                        <i className='fa-solid fa-pen' aria-hidden='true' />
                      </button>
                      <button className='btn btn-ghost btn-sm' disabled={busy} onClick={handleClearGroup} title='Remove group email'>
                        <i className='fa-solid fa-xmark' aria-hidden='true' />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={s.groupEmailEmpty}>No group email — notifications go to all members</span>
                      <button className='btn btn-ghost btn-sm' onClick={() => setEditingGroup(true)}>
                        <i className='fa-solid fa-plus' aria-hidden='true' /> Set
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            <div className={s.memberList}>
              {members[selectedKey] === undefined ? (
                <div className='muted' style={{ fontSize: '0.82rem', padding: '0.25rem 0' }}>Loading…</div>
              ) : current.length === 0 ? (
                <div className='muted' style={{ fontSize: '0.82rem' }}>No members yet.</div>
              ) : (
                current.map((email) => {
                  const name = nameFor(email);
                  return (
                    <div key={email} className={s.memberRow}>
                      <span className={s.memberEmail}>{email}</span>
                      {name && <span className={s.memberName}>{name}</span>}
                      <button
                        className='btn btn-ghost btn-sm'
                        disabled={busy}
                        onClick={() => handleRemove(email)}
                        title='Remove member'
                      >
                        <i className='fa-solid fa-xmark' aria-hidden='true' />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className={s.addRow}>
              <div className={s.addInputWrap} ref={addWrapRef}>
                <input
                  className={`input ${s.addInput}`}
                  placeholder='Search by name or email…'
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setShowSuggestions(true);
                    setHighlightIndex(-1);
                  }}
                  onFocus={() => { if (newEmail.trim()) setShowSuggestions(true); }}
                  onKeyDown={handleInputKeyDown}
                  autoComplete='off'
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className={s.suggestions} role='listbox'>
                    {suggestions.map((u, i) => (
                      <div
                        key={u.email}
                        className={`${s.suggestionItem} ${i === highlightIndex ? s.highlighted : ''}`}
                        role='option'
                        aria-selected={i === highlightIndex}
                        onMouseDown={(e) => { e.preventDefault(); handleAdd(u.email); }}
                        onMouseEnter={() => setHighlightIndex(i)}
                      >
                        <div className={s.avatar} style={{ width: 28, height: 28, fontSize: '0.7rem', flexShrink: 0 }}>
                          {initials(u.name)}
                        </div>
                        <div className={s.suggestionMeta}>
                          <span className={s.userName}>{u.name}</span>
                          <span className={s.userEmail}>{u.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                className='btn btn-primary btn-sm'
                disabled={busy || !newEmail.trim()}
                onClick={() => handleAdd()}
              >
                <i className='fa-solid fa-plus' aria-hidden='true' /> Add
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function shortRole(role: string): string {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'operations_admin') return 'Ops Admin';
  return role;
}
