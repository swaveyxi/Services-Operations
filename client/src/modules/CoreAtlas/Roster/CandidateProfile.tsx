import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatDate, formatDateTime, humanizeSlug } from '@/utils/format';
import { getCandidateById, candidateJourneyStatus } from '../services/candidates';
import { getPipelineStages } from '../services/campaigns';
import type { CandidateProfile as CandidateProfileType, PipelineStage } from '../types';
import { JourneyStage } from './JourneyStage';
import s from './CandidateProfile.module.css';

export default function CandidateProfile() {
  const { id = '', candidateId = '' } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<CandidateProfileType | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getCandidateById(id, candidateId), getPipelineStages(id)]).then(([c, st]) => {
      if (!active) return;
      setCandidate(c);
      setStages(st);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id, candidateId]);

  if (loading) return <div className="loading-state">Loading candidate…</div>;
  if (!candidate) {
    return (
      <div className="empty-state">
        <i className="fa-solid fa-user-slash" aria-hidden="true" /> Candidate not found.
      </div>
    );
  }

  const metaEntries = Object.entries(candidate.meta ?? {});

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/atlas/${id}/candidates`)} style={{ marginBottom: 'var(--space-4)' }}>
        <i className="fa-solid fa-chevron-left" aria-hidden="true" /> Candidates
      </button>

      <div className={s.header}>
        <div className={s.avatarLg}>{initials(candidate.name)}</div>
        <div style={{ flex: 1 }}>
          <div className={s.titleRow}>
            <h1 className="page-title">{candidate.name}</h1>
            <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--c-text-faint)' }}>
              {candidate.id}
            </span>
            {candidate.identity_state === 'CONFIRMED' && (
              <span className="badge badge--positive">
                <i className="fa-solid fa-circle-check" aria-hidden="true" /> NIN confirmed
              </span>
            )}
            {candidate.status === 'WITHDRAWN' && <span className="badge badge--neutral">Withdrawn</span>}
          </div>
          <div className={s.metaLine}>
            Invited {formatDate(candidate.invited_at)} {candidate.invited_by_platform && <>via {humanizeSlug(candidate.invited_by_platform)}</>} ·{' '}
            {candidate.is_returning ? 'Returning candidate' : 'First-time candidate'}
          </div>
        </div>
      </div>

      <div className={s.grid}>
        {/* LEFT */}
        <div className={s.col}>
          <section className="card">
            <div className="section-head" style={{ padding: 'var(--space-4) var(--space-5)', marginBottom: 0, borderBottom: '1px solid var(--c-border)' }}>
              <h2 className="section-title">Campaign journey</h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--c-text-muted)' }}>{stages.length} stages</span>
            </div>
            <div className={s.journey}>
              <div className={s.journeyLine} />
              {stages.map((stage, i) => {
                const result = candidate.stage_results.find((r) => r.platformSlug === stage.platform_slug);
                return (
                  <JourneyStage
                    key={stage.platform_slug}
                    idx={i + 1}
                    title={stage.platform_name}
                    status={candidateJourneyStatus(candidate, stages, stage.platform_slug)}
                    last={i === stages.length - 1}
                  >
                    {result ? (
                      <div className={s.stageBody}>
                        <Row k="Outcome" v={result.computedOutcome} />
                        {result.compositeScore !== null && <Row k="Score" v={<span className="mono" style={{ fontWeight: 600 }}>{result.compositeScore}</span>} />}
                        {result.flagCount > 0 && <Row k="Flags" v={<span style={{ color: 'var(--t-pending-fg)' }}>{result.flagCount}</span>} />}
                        <Row k="Completed" v={formatDateTime(result.completedAt)} />
                      </div>
                    ) : (
                      <div className={s.stageBodyMuted}>Candidate has not reached this stage yet.</div>
                    )}
                  </JourneyStage>
                );
              })}
            </div>
          </section>

          {metaEntries.length > 0 && (
            <section className="card card-pad">
              <div className="section-head">
                <h2 className="section-title">Application data</h2>
              </div>
              <div className={s.stageBody}>
                {metaEntries.map(([key, value]) => (
                  <Row key={key} k={humanize(key)} v={String(value)} />
                ))}
              </div>
            </section>
          )}

          {candidate.shortlist_memberships.length > 0 && (
            <section className="card card-pad">
              <div className="section-head">
                <h2 className="section-title">Shortlist memberships</h2>
                <span style={{ fontSize: '0.7rem', color: 'var(--c-text-muted)' }}>{candidate.shortlist_memberships.length}</span>
              </div>
              {candidate.shortlist_memberships.map((sm) => (
                <div key={sm.shortlistId} className={s.priorItem}>
                  <div className={s.priorTitle}>
                    <Link to={`/atlas/${id}/shortlist`}>{sm.shortlistName}</Link>
                  </div>
                  <div className={s.priorOutcome}>
                    {sm.source} · <span className={sm.status === 'PROGRESSED' ? s.win : undefined}>{sm.status}</span>
                    {sm.matchReason && ` — ${sm.matchReason}`}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* RIGHT */}
        <div className={s.col}>
          <section className="card">
            <div className="section-head" style={{ padding: 'var(--space-4) var(--space-5)', marginBottom: 0, borderBottom: '1px solid var(--c-border)' }}>
              <h2 className="section-title">Identity record</h2>
              <span className={`badge badge--${candidate.identity_state === 'CONFIRMED' ? 'positive' : candidate.identity_state === 'FLAGGED' ? 'negative' : 'pending'}`}>
                {humanizeSlug(candidate.identity_state)}
              </span>
            </div>
            <div style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div className={s.kvRow}>
                <span className={s.kvKey}>Global Candidate ID</span>
                <span className={`mono ${s.kvVal}`}>{candidate.guid}</span>
              </div>
              <div className={s.kvRow}>
                <span className={s.kvKey}>NIN</span>
                <span className={`mono ${s.kvVal}`}>{candidate.nin_masked ?? '—'}</span>
              </div>
              <div className={s.kvRow}>
                <span className={s.kvKey}>Identity confidence</span>
                <span className={s.kvVal}>{humanizeSlug(candidate.identity_confidence)}</span>
              </div>
              <div className={s.kvDivider} />
              <div className={s.kvRow}>
                <span className={s.kvKey}>Email</span>
                <span className={s.kvVal}>{candidate.email ?? '—'}</span>
              </div>
              <div className={s.kvRow}>
                <span className={s.kvKey}>Phone</span>
                <span className={`mono ${s.kvVal}`}>{candidate.phone ?? '—'}</span>
              </div>
            </div>
          </section>

          <section className="card card-pad">
            <div className="section-head">
              <h2 className="section-title">Communications</h2>
              <span className="badge badge--neutral">{candidate.communications.length} messages</span>
            </div>
            {candidate.communications.length === 0 ? (
              <div className={s.stageBodyMuted}>No communications recorded yet.</div>
            ) : (
              candidate.communications.map((m) => {
                const tone = m.currentState === 'OPENED' || m.currentState === 'CLICKED' || m.currentState === 'RESPONDED' ? 'positive' : m.currentState === 'FAILED' ? 'negative' : 'neutral';
                return (
                  <div key={m.id} className={s.commsItem}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={s.commsType}>{humanizeSlug(m.messageType)}</div>
                      <div className={s.commsMeta}>
                        <span>
                          <i className={`fa-solid ${m.channel === 'EMAIL' ? 'fa-envelope' : 'fa-comment-sms'}`} aria-hidden="true" /> {humanizeSlug(m.channel)}
                        </span>
                        <span>·</span>
                        <span>{humanizeSlug(m.platformSlug)}</span>
                      </div>
                      {m.sentAt && <div className={`mono ${s.commsTime}`}>{formatDateTime(m.sentAt)}</div>}
                    </div>
                    <span className={`badge badge--${tone} ${s.commsState}`}>{humanizeSlug(m.currentState)}</span>
                  </div>
                );
              })
            )}
            <Link to={`/atlas/${id}/communications/candidates/${candidate.guid}`} className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-3)' }}>
              View full communications timeline <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((n) => n[0]?.toUpperCase()).slice(0, 2).join('');
}

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className={s.row}>
      <span className={s.rowKey}>{k}</span>
      <span className={s.rowVal}>{v}</span>
    </div>
  );
}
