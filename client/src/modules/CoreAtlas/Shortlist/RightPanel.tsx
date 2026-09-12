import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { humanizeSlug } from '@/utils/format';
import { lockShortlist, progressShortlist } from '../services/shortlist';
import type { PipelineStage, Shortlist, ShortlistDetail } from '../types';
import s from './Shortlist.module.css';

export function RightPanel({
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
  const { showToast } = useToast();
  const [locking, setLocking] = useState(false);
  const [progressing, setProgressing] = useState(false);
  const [destination, setDestination] = useState('');

  const destinationOptions = stages.filter((st) => st.platform_slug !== summary.platform_slug);

  async function onLock() {
    setLocking(true);
    try {
      const result = await lockShortlist(campaignId, summary.id);
      await onChanged();
      showToast(
        result.superseded_ids.length > 0
          ? `Locked — superseded ${result.superseded_ids.length} earlier shortlist(s) for this stage.`
          : 'Shortlist locked.',
        'success',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to lock shortlist.', 'error');
    } finally {
      setLocking(false);
    }
  }

  async function onProgress() {
    if (!destination) return;
    setProgressing(true);
    try {
      const result = await progressShortlist(campaignId, summary.id, destination);
      await onChanged();
      showToast(
        `Progressed ${result.candidate_count} candidate(s)${result.skipped_count ? ` (${result.skipped_count} skipped)` : ''}.`,
        'success',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to progress shortlist.', 'error');
    } finally {
      setProgressing(false);
    }
  }

  return (
    <div className="card">
      <div className={s.panelSection}>
        <div className={s.panelHead}>
          <span className="eyebrow">Shortlist</span>
        </div>
        <div className={s.draftCount}>
          <span className={`mono ${s.draftCountNum}`}>{detail?.candidate_count ?? summary.candidate_count}</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--c-text-muted)' }}>candidates</span>
        </div>
        <div className={s.breakdownRow}>
          <span className={s.breakdownLabel}>
            <span className={s.breakdownDot} /> Created by
          </span>
          <span style={{ fontWeight: 500 }}>{summary.created_by}</span>
        </div>
        {summary.locked_by && (
          <div className={s.lockedByRow}>
            <span>Locked by {summary.locked_by}</span>
          </div>
        )}
      </div>

      <div className={s.panelSection}>
        {summary.status === 'DRAFT' && (
          <>
            <div className={s.panelHead}>
              <span className="eyebrow">Lock</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
              Locking freezes membership and supersedes any other locked shortlist for this stage.
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={summary.candidate_count === 0 || locking}
              onClick={onLock}
            >
              {locking ? 'Locking…' : 'Lock shortlist'}
            </button>
            {summary.candidate_count === 0 && (
              <div style={{ fontSize: '0.7rem', color: 'var(--c-text-faint)', marginTop: 'var(--space-2)' }}>
                Add at least one candidate before locking.
              </div>
            )}
          </>
        )}

        {summary.status === 'LOCKED' && (
          <>
            <div className={s.panelHead}>
              <span className="eyebrow">Progress to next stage</span>
            </div>
            {destinationOptions.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)' }}>No other configured stages to progress to.</div>
            ) : (
              <>
                <select
                  className="select"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  style={{ marginBottom: 'var(--space-3)' }}
                >
                  <option value="">Select a stage…</option>
                  {destinationOptions.map((st) => (
                    <option key={st.platform_slug} value={st.platform_slug}>
                      {st.platform_name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={!destination || progressing}
                  onClick={onProgress}
                >
                  {progressing ? 'Progressing…' : `Progress ${summary.candidate_count} candidates`}
                </button>
                <div style={{ fontSize: '0.68rem', color: 'var(--c-text-muted)', marginTop: 'var(--space-2)', lineHeight: 1.45 }}>
                  This action is irreversible.
                </div>
              </>
            )}
          </>
        )}

        {summary.status === 'PROGRESSED' && detail?.progression && (
          <>
            <div className={s.panelHead}>
              <span className="eyebrow">Progressed</span>
            </div>
            <div className={s.progressedIcon}>
              <i className="fa-solid fa-check" aria-hidden="true" />
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: 'var(--space-3)', lineHeight: 1.5 }}>
              {detail.progression.candidate_count} candidates moved from {humanizeSlug(detail.progression.from_platform)} to{' '}
              {humanizeSlug(detail.progression.destination_platform_slug)}
              {detail.progression.skipped_count > 0 && <> ({detail.progression.skipped_count} skipped)</>}
            </div>
          </>
        )}

        {summary.status === 'SUPERSEDED' && (
          <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)', lineHeight: 1.5 }}>
            A newer locked shortlist for this stage superseded this one.
          </div>
        )}
      </div>
    </div>
  );
}
