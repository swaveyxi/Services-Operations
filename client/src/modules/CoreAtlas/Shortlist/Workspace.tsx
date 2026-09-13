import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { humanizeSlug, titleCase } from '@/utils/format';
import { getCandidates } from '../services/candidates';
import {
  addShortlistMembers,
  getShortlistDetail,
  queryShortlist,
  removeShortlistMember,
  uploadShortlistCandidates,
} from '../services/shortlist';
import type {
  Candidate,
  PipelineStage,
  Shortlist,
  ShortlistCandidateUploadResult,
  ShortlistDetail,
  ShortlistMember,
  ShortlistQueryMatch,
  ShortlistQueryResult,
} from '../types';
import { CandidateRow } from './CandidateRow';
import s from './Shortlist.module.css';

function StatusBadge({ status }: { status: Shortlist['status'] }) {
  const tone =
    status === 'LOCKED'
      ? 'positive'
      : status === 'PROGRESSED'
        ? 'info'
        : status === 'SUPERSEDED' || status === 'DISCARDED'
          ? 'neutral'
          : 'pending';
  return <span className={`badge badge--${tone}`}>{humanizeSlug(status)}</span>;
}

export function Workspace({
  campaignId,
  stages,
  summary,
  detail,
  onChanged,
}: {
  campaignId: string;
  stages: PipelineStage[];
  summary: Shortlist;
  detail: ShortlistDetail | null | undefined;
  onChanged: () => Promise<void>;
}) {
  const stage = stages.find((st) => st.platform_slug === summary.platform_slug);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="card card-pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h2 className="section-title" style={{ fontSize: '1.05rem' }}>
            {summary.name}
          </h2>
          <span className="badge badge--neutral">{stage?.platform_name ?? humanizeSlug(summary.platform_slug)}</span>
          <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--c-text-faint)' }}>
            v{summary.version}
          </span>
          <StatusBadge status={summary.status} />
        </div>
        <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--c-text-muted)' }}>
          Created by {summary.created_by} · {summary.candidate_count} candidate{summary.candidate_count === 1 ? '' : 's'}
        </p>
      </div>

      {detail === undefined ? (
        <div className="loading-state">Loading shortlist…</div>
      ) : !detail ? (
        <div className="empty-state">Couldn't load this shortlist.</div>
      ) : detail.status === 'DRAFT' ? (
        <DraftBody campaignId={campaignId} stages={stages} detail={detail} onChanged={onChanged} />
      ) : (
        <MembersReadOnly detail={detail} />
      )}
    </div>
  );
}

function MembersReadOnly({ detail }: { detail: ShortlistDetail }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        className="section-head"
        style={{ padding: 'var(--space-4) var(--space-5)', marginBottom: 0, borderBottom: '1px solid var(--c-border)' }}
      >
        <h2 className="section-title">Members · {detail.members.length}</h2>
      </div>
      {detail.members.length === 0 ? (
        <div className="empty-state">No members.</div>
      ) : (
        <div className={s.rows} style={{ padding: 'var(--space-4)' }}>
          {detail.members.map((m) => (
            <CandidateRow
              key={m.id}
              name={m.display_name}
              subtitle={m.match_reason ?? sourceLabel(m.source)}
              tags={[
                ...(m.current_stage_slug ? [humanizeSlug(m.current_stage_slug)] : []),
                ...applicationFieldTags(m.application_fields),
              ]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function sourceLabel(source: string): string {
  if (source === 'AI_MATCHED') return 'Added via AI query';
  if (source === 'MANUAL_UPLOAD') return 'Added via upload';
  return 'Added from roster';
}

// Application data has no fixed schema — it's whatever columns a campaign's
// own CSV/invite carried — so tags are built generically rather than
// assuming named keys like "university" or "grade" exist.
function applicationFieldTags(fields: Record<string, unknown> | undefined): string[] {
  return Object.entries(fields ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${humanizeSlug(key)}: ${value}`);
}

function memberTags(m: ShortlistMember): string[] {
  const tags: string[] = [];
  if (m.current_stage_slug) tags.push(humanizeSlug(m.current_stage_slug));
  tags.push(humanizeSlug(m.status));
  if (m.is_override) tags.push('Manual override');
  tags.push(...applicationFieldTags(m.application_fields));
  return tags;
}

function DraftBody({
  campaignId,
  stages,
  detail,
  onChanged,
}: {
  campaignId: string;
  stages: PipelineStage[];
  detail: ShortlistDetail;
  onChanged: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'roster' | 'query' | 'csv'>('roster');
  const [queryText, setQueryText] = useState('');
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<ShortlistQueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const [roster, setRoster] = useState<Candidate[] | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<ShortlistCandidateUploadResult | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const stageName = stages.find((st) => st.platform_slug === detail.platform_slug)?.platform_name ?? humanizeSlug(detail.platform_slug);

  const memberIds = new Set(detail.members.map((m) => m.campaign_candidate_id));
  // Derived from `detail.members` on every render, not filtered once at
  // fetch/add time — so a candidate reappears here immediately if they're
  // later removed from the shortlist, without needing a page refresh.
  // `roster` itself is already scoped server-side to this shortlist's own
  // stage (see loadRoster) — a shortlist only makes sense for candidates who
  // have actually reached it by passing every stage before it, so there's no
  // stage picker here: this list is never "all campaign candidates."
  const availableRoster = roster?.filter((c) => !memberIds.has(c.id)) ?? null;
  const filteredRoster =
    availableRoster?.filter((c) => {
      if (rosterSearch && !c.name.toLowerCase().includes(rosterSearch.toLowerCase())) return false;
      return true;
    }) ?? null;

  // The roster tab is the default view, so load it eagerly rather than
  // waiting for the operator to click into it.
  useEffect(() => {
    if (!roster) loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Best-effort: the doc doesn't document the completed queryHistory entry's
  // shape, so this defensively looks for a `matches` array and otherwise
  // just stops polling — see the plan's flagged gap.
  useEffect(() => {
    if (queryResult?.mode !== 'QUEUED') return;
    let cancelled = false;
    let attempts = 0;
    const startLen = detail.query_history.length;
    const interval = setInterval(async () => {
      attempts += 1;
      const fresh = await getShortlistDetail(campaignId, detail.id);
      if (cancelled || !fresh) return;
      if (fresh.query_history.length > startLen) {
        clearInterval(interval);
        const entry = fresh.query_history[fresh.query_history.length - 1] as Record<string, unknown>;
        const matches = Array.isArray(entry?.matches) ? (entry.matches as ShortlistQueryMatch[]) : [];
        setQueryResult((prev) => (prev ? { ...prev, mode: 'SYNC', matches } : prev));
        onChanged();
      } else if (attempts >= 15) {
        clearInterval(interval);
      }
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [queryResult?.mode, campaignId, detail.id, detail.query_history.length, onChanged]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll(ids: string[]) {
    setSelected((prev) => new Set([...prev, ...ids]));
  }

  function deselectAll(ids: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  async function runQuery() {
    setQuerying(true);
    setQueryError(null);
    setQueryResult(null);
    setSelected(new Set());
    try {
      const result = await queryShortlist(campaignId, detail.id, queryText.trim());
      setQueryResult(result);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : 'Query failed.');
    } finally {
      setQuerying(false);
    }
  }

  async function addSelectedMatches() {
    if (!queryResult || selected.size === 0) return;
    setAdding(true);
    try {
      const members = queryResult.matches
        .filter((m) => selected.has(m.campaign_candidate_id))
        .map((m) => ({
          campaign_candidate_id: m.campaign_candidate_id,
          source: 'AI_MATCHED' as const,
          match_reason: m.match_reasons[0],
        }));
      await addShortlistMembers(campaignId, detail.id, members);
      setSelected(new Set());
      setQueryResult(null);
      setQueryText('');
      await onChanged();
      showToast('Candidates added to shortlist.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add candidates.', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function loadRoster() {
    setRosterLoading(true);
    try {
      // Scoped to this shortlist's own stage — only candidates who have
      // actually reached it (i.e. passed every stage before it) are
      // eligible, never the full campaign roster.
      const atStage = await getCandidates(campaignId, { stage: detail.platform_slug });
      setRoster(atStage);
    } finally {
      setRosterLoading(false);
    }
  }

  async function addSelectedRoster() {
    if (!availableRoster || selected.size === 0) return;
    setAdding(true);
    try {
      const members = availableRoster
        .filter((c) => selected.has(c.id))
        .map((c) => ({ campaign_candidate_id: c.id, source: 'PLATFORM_DATA' as const }));
      await addShortlistMembers(campaignId, detail.id, members);
      setSelected(new Set());
      await onChanged();
      showToast('Candidates added to shortlist.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add candidates.', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(memberId: string) {
    try {
      await removeShortlistMember(campaignId, detail.id, memberId);
      await onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove member.', 'error');
    }
  }

  async function uploadCsv() {
    if (!csvFile) return;
    setCsvUploading(true);
    setCsvError(null);
    setCsvResult(null);
    try {
      const result = await uploadShortlistCandidates(campaignId, detail.id, csvFile);
      setCsvResult(result);
      setCsvFile(null);
      await onChanged();
      showToast(`${result.added} candidate${result.added === 1 ? '' : 's'} added from CSV.`, 'success');
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setCsvUploading(false);
    }
  }

  return (
    <>
      <div className="card card-pad">
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <button
            className={mode === 'roster' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => {
              setMode('roster');
              if (!roster) loadRoster();
            }}
          >
            <i className="fa-solid fa-users" aria-hidden="true" /> Browse roster
          </button>
          <button
            className={mode === 'query' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => setMode('query')}
          >
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> AI query
          </button>
          <button
            className={mode === 'csv' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => setMode('csv')}
          >
            <i className="fa-solid fa-file-csv" aria-hidden="true" /> Upload CSV
          </button>
        </div>

        {mode === 'roster' ? (
          rosterLoading ? (
            <div className="loading-state">Loading roster…</div>
          ) : !availableRoster || availableRoster.length === 0 ? (
            <div className="empty-state">No candidates have reached {stageName} yet.</div>
          ) : (
            <>
              <div className={s.rosterFilters}>
                <div className={s.searchWrap}>
                  <i className={`fa-solid fa-magnifying-glass ${s.searchIcon}`} aria-hidden="true" />
                  <input
                    className={s.searchInput}
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search by name"
                  />
                </div>
                <span className={s.staticHint}>
                  <i className="fa-solid fa-circle-info" aria-hidden="true" /> Showing candidates who have reached {stageName}
                </span>
              </div>

              {!filteredRoster || filteredRoster.length === 0 ? (
                <div className="empty-state">No candidates match your filters.</div>
              ) : (
                <>
                  <div className={s.selectionBar}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>
                      {filteredRoster.length} candidate{filteredRoster.length === 1 ? '' : 's'}
                    </span>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => selectAll(filteredRoster.map((c) => c.id))}
                      >
                        Select all
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => deselectAll(filteredRoster.map((c) => c.id))}
                      >
                        Deselect all
                      </button>
                    </div>
                  </div>
                  <div className={s.rows}>
                    {filteredRoster.map((c) => (
                      <CandidateRow
                        key={c.id}
                        name={c.name}
                        subtitle={c.current_stage_slug ? humanizeSlug(c.current_stage_slug) : 'Not yet staged'}
                        tags={applicationFieldTags(c.meta)}
                        checked={selected.has(c.id)}
                        onToggle={() => toggle(c.id)}
                        trailing={
                          <Link to={`/atlas/${campaignId}/candidates/${c.id}`} className={s.viewLink}>
                            View profile <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                          </Link>
                        }
                      />
                    ))}
                  </div>
                  <div style={{ marginTop: 'var(--space-3)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary btn-sm" disabled={selected.size === 0 || adding} onClick={addSelectedRoster}>
                      {adding ? 'Adding…' : `Add ${selected.size || ''} to shortlist`}
                    </button>
                  </div>
                </>
              )}
            </>
          )
        ) : mode === 'query' ? (
          <div className={s.promptWrap}>
            <textarea
              className={s.promptTextarea}
              rows={5}
              placeholder="Describe who you're looking for — e.g. Candidates who scored above 80 on FOT with no flags"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
            <div className={s.promptHint}>
              <i className="fa-solid fa-circle-info" aria-hidden="true" /> Natural language, 3–4000 characters
            </div>
            <div className={s.promptSubmit}>
              <button className="btn btn-primary" disabled={querying || queryText.trim().length < 3} onClick={runQuery}>
                {querying ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Searching…
                  </>
                ) : (
                  <>
                    Find candidates <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            />
            <div className={s.staticHint} style={{ marginTop: 'var(--space-2)' }}>
              <i className="fa-solid fa-circle-info" aria-hidden="true" /> Headers: nin/email/phone/name (any combination) — max
              10,000 rows. Everything else in a row becomes candidate application data.
            </div>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <button className="btn btn-primary" disabled={!csvFile || csvUploading} onClick={uploadCsv}>
                {csvUploading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Uploading…
                  </>
                ) : (
                  <>
                    Upload candidates <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {mode === 'query' && queryError && (
        <div className="empty-state" style={{ borderColor: 'var(--t-negative-bd)' }}>
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {queryError}
        </div>
      )}

      {mode === 'csv' && csvError && (
        <div className="empty-state" style={{ borderColor: 'var(--t-negative-bd)' }}>
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {csvError}
        </div>
      )}

      {mode === 'csv' && csvResult && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div
            className="section-head"
            style={{
              padding: 'var(--space-4) var(--space-5)',
              marginBottom: 0,
              borderBottom: csvResult.skipped.length > 0 ? '1px solid var(--c-border)' : undefined,
            }}
          >
            <h2 className="section-title">{csvResult.added} added</h2>
            {csvResult.skipped.length > 0 && <span className="badge badge--pending">{csvResult.skipped.length} skipped</span>}
          </div>
          {csvResult.skipped.length > 0 && (
            <div style={{ padding: 'var(--space-4) var(--space-5)', fontSize: '0.8rem', color: 'var(--c-text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {csvResult.skipped.map((row, i) => (
                <div key={i}>
                  Row {row.row}: {row.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === 'query' && queryResult?.mode === 'QUEUED' && (
        <div className="empty-state">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Large candidate pool ({queryResult.candidate_pool_size}) — query
          queued, checking for results…
        </div>
      )}

      {mode === 'query' && queryResult && queryResult.mode === 'SYNC' && queryResult.matches.length === 0 && (
        <div className="empty-state">
          No candidates matched this query, out of {queryResult.candidate_pool_size} in the pool
          {queryResult.brief_criteria_applied ? ' (a brief is applied — its criteria narrow the match too)' : ''}.
          Try rephrasing, or switch to Browse roster.
        </div>
      )}

      {mode === 'query' && queryResult && queryResult.matches.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div
            className="section-head"
            style={{ padding: 'var(--space-4) var(--space-5)', marginBottom: 0, borderBottom: '1px solid var(--c-border)' }}
          >
            <h2 className="section-title">
              {queryResult.matched_count} match{queryResult.matched_count === 1 ? '' : 'es'} · from {queryResult.candidate_pool_size}{' '}
              candidates
            </h2>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  selectAll(queryResult.matches.filter((m) => !m.already_member).map((m) => m.campaign_candidate_id))
                }
              >
                Select all
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => deselectAll(queryResult.matches.map((m) => m.campaign_candidate_id))}
              >
                Deselect all
              </button>
            </div>
          </div>
          <div className={s.rows} style={{ padding: 'var(--space-4)' }}>
            {queryResult.matches.map((m) => (
              <CandidateRow
                key={m.campaign_candidate_id}
                name={m.display_name}
                subtitle={m.match_reasons.join(' · ')}
                tags={[titleCase(m.confidence), ...applicationFieldTags(m.application_fields)]}
                checked={selected.has(m.campaign_candidate_id)}
                onToggle={() => toggle(m.campaign_candidate_id)}
                disabled={m.already_member}
              />
            ))}
          </div>
          <div
            style={{
              padding: 'var(--space-4) var(--space-5)',
              borderTop: '1px solid var(--c-border)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button className="btn btn-primary btn-sm" disabled={selected.size === 0 || adding} onClick={addSelectedMatches}>
              {adding ? 'Adding…' : `Add ${selected.size || ''} to shortlist`}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          className="section-head"
          style={{ padding: 'var(--space-4) var(--space-5)', marginBottom: 0, borderBottom: '1px solid var(--c-border)' }}
        >
          <h2 className="section-title">Current members · {detail.members.length}</h2>
        </div>
        {detail.members.length === 0 ? (
          <div className="empty-state">No members yet.</div>
        ) : (
          <div className={s.rows} style={{ padding: 'var(--space-4)' }}>
            {detail.members.map((m) => (
              <CandidateRow
                key={m.id}
                name={m.display_name}
                subtitle={m.match_reason ?? sourceLabel(m.source)}
                tags={memberTags(m)}
                trailing={
                  <>
                    <Link to={`/atlas/${campaignId}/candidates/${m.campaign_candidate_id}`} className={s.viewLink}>
                      View profile <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                    </Link>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeMember(m.id)} aria-label={`Remove ${m.display_name}`}>
                      <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
