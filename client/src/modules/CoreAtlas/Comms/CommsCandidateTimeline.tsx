import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCandidateCommsProfile } from '../services/comms';
import { getCandidateById } from '../services/candidates';
import { formatDateTime, humanizeSlug } from '@/utils/format';
import type { CandidateCommsProfile, CandidateProfile } from '../types';
import { StatePill, initials } from './shared';
import s from './Comms.module.css';

export default function CommsCandidateTimeline() {
  const { id = '', candidateId = '' } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<CandidateProfile | null | undefined>(undefined);
  const [profile, setProfile] = useState<CandidateCommsProfile | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getCandidateById(id, candidateId), getCandidateCommsProfile(id, candidateId)]).then(([c, p]) => {
      if (!active) return;
      setCandidate(c);
      setProfile(p);
    });
    return () => {
      active = false;
    };
  }, [id, candidateId]);

  if (candidate === undefined) return <div className="loading-state">Loading timeline…</div>;

  const backBtn = (
    <button className={s.backBtn} onClick={() => navigate(-1)}>
      <i className="fa-solid fa-chevron-left" aria-hidden="true" /> Back
    </button>
  );

  if (!candidate) {
    return (
      <>
        {backBtn}
        <div className="empty-state">
          <i className="fa-solid fa-inbox" aria-hidden="true" /> Candidate not found.
        </div>
      </>
    );
  }

  const messages = profile?.messages ?? [];

  return (
    <>
      {backBtn}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className={s.avatarLg}>{initials(candidate.name)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 className="page-title">{candidate.name}</h1>
            <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--c-text-faint)' }}>
              {candidate.id}
            </span>
            {candidate.identity_state === 'CONFIRMED' && (
              <span className="badge badge--positive">
                <i className="fa-solid fa-circle-check" aria-hidden="true" /> NIN confirmed
              </span>
            )}
          </div>
          <p className="page-sub">
            {messages.length} message{messages.length === 1 ? '' : 's'} across all channels
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/atlas/${id}/candidates/${candidate.id}`)}>
          Open profile <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
        </button>
      </div>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="section-head" style={{ padding: 'var(--space-3) var(--space-5)', marginBottom: 0, borderBottom: '1px solid var(--c-border)' }}>
          <h2 className="section-title">Communication timeline</h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--c-text-muted)' }}>{messages.length} messages</span>
        </div>
        {messages.length === 0 ? (
          <div className="empty-state">No communications recorded for this candidate yet.</div>
        ) : (
          <div className={s.timelineWrap}>
            <div className={s.timelineRail} />
            {messages.map((m) => (
              <div key={m.id} className={s.timelineEvent}>
                <div className={s.timelineNode} />
                <div className={s.timelineCard}>
                  <div className={s.timelineCardHead}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', minWidth: 0 }}>
                      <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(m.created_at)}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--c-text)' }}>{humanizeSlug(m.message_type)}</span>
                    </div>
                    <StatePill state={m.current_state} />
                  </div>
                  <div className={s.timelineMeta}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <i className={`fa-solid ${m.channel === 'EMAIL' ? 'fa-envelope' : 'fa-comment-sms'}`} aria-hidden="true" />
                      {humanizeSlug(m.channel)}
                    </span>
                    <span>·</span>
                    <span>{humanizeSlug(m.platform_slug)}</span>
                  </div>
                  {m.events.length > 0 && (
                    <div className={s.timelineDetail}>
                      {m.events.map((e) => `${humanizeSlug(e.canonicalState)} at ${formatDateTime(e.occurredAt)}`).join(' → ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
