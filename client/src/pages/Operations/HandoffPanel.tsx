import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useServiceCall } from '@/hooks/useServiceCall';
import { getFormById, acknowledgeHandoff, completeHandoff } from '@/services';
import type { SupportForm, HandoffEntry, OneDriveFile } from '@shared/types';
import { FormDetailBody } from '@/components/FormDetailBody';
import { AttachmentField } from '@/components/AttachmentField';
import { FORM_CATALOG_META, FORM_TITLE_TO_KEY } from '@shared/constants';
import { formatDate } from '@/utils/format';
import type { TeamOutletContext } from './Team';
import s from './Operations.module.css';

type CompletionState = {
  handoffId: string;
  files: OneDriveFile[];
};

export default function HandoffPanel() {
  const { formId = '' } = useParams();
  const navigate = useNavigate();
  const { team, handoffs, campaignMap, userMap, onFormChanged } =
    useOutletContext<TeamOutletContext>();
  const { userName } = useAuth();
  const [busy, call] = useServiceCall();

  const [form, setForm] = useState<SupportForm | null>(
    () => handoffs.find((f) => f.id === formId) ?? null,
  );
  const [completing, setCompleting] = useState<CompletionState | null>(null);

  useEffect(() => {
    const found = handoffs.find((f) => f.id === formId);
    if (found) {
      setForm(found);
      return;
    }
    let alive = true;
    getFormById(formId).then((f) => {
      if (alive) setForm(f);
    });
    return () => {
      alive = false;
    };
  }, [formId, handoffs]);

  function startComplete(handoffId: string) {
    setCompleting({ handoffId, files: [] });
  }

  async function submitCompletion() {
    if (!form || !completing) return;
    const report = completing.files.length ? completing.files : null;
    const updated = await call(() => completeHandoff(form.id, completing.handoffId, report));
    if (updated) {
      onFormChanged(updated);
      setForm(updated);
      setCompleting(null);
      const stillActive = updated.handoffs
        .filter((h) => h.team === team.name)
        .some((h) => h.status !== 'Completed');
      if (!stillActive) navigate(`/operations/${team.slug}`);
    }
  }

  async function handleAcknowledge(handoff: HandoffEntry) {
    if (!form) return;
    const updated = await call(() => acknowledgeHandoff(form.id, handoff.id));
    if (updated) {
      onFormChanged(updated);
      setForm(updated);
    }
  }

  return (
    <div className={s.detailWrap}>
      {!form ? (
        <div className='card card-pad'>
          <div className={s.detailEmpty}>
            <i
              className='fa-solid fa-circle-question'
              aria-hidden='true'
              style={{ fontSize: '1.4rem' }}
            />
            Handoff not found.
          </div>
        </div>
      ) : (
        <div className='card'>
          <div className={s.detailHead}>
            <div>
              <h2 className={s.detailTitle}>
                {FORM_CATALOG_META[FORM_TITLE_TO_KEY[form.form_type]]?.title || form.form_type}
              </h2>
              <div className={s.detailMeta}>
                <span className={s.cid}>{campaignMap[form.campaign_id] ?? form.campaign_id}</span>
                {form.submitter_name && <> · Submitted by {form.submitter_name}</>}
                {form.submitted_on && <> · {formatDate(form.submitted_on)}</>}
              </div>
            </div>
          </div>

          <div className={s.detailBody}>
            <FormDetailBody form={form} hideMeta userMap={userMap} />
          </div>

          {/* Only show handoffs addressed to this team */}
          <div className={s.handoffList}>
            {form.handoffs
              .filter((h) => h.team === team.name)
              .map((h) => (
                <HandoffEntryRow
                  key={h.id}
                  handoff={h}
                  busy={busy}
                  completing={completing}
                  onAcknowledge={() => handleAcknowledge(h)}
                  onStartComplete={() => startComplete(h.id)}
                  onCancelComplete={() => setCompleting(null)}
                  onFilesChange={(files) => setCompleting((c) => c && { ...c, files })}
                  onSubmitCompletion={submitCompletion}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Per-handoff row ──────────────────────────────────────────────────────────

type EntryRowProps = {
  handoff: HandoffEntry;
  busy: boolean;
  completing: CompletionState | null;
  onAcknowledge: () => void;
  onStartComplete: () => void;
  onCancelComplete: () => void;
  onFilesChange: (files: OneDriveFile[]) => void;
  onSubmitCompletion: () => void;
};

function HandoffEntryRow({
  handoff,
  busy,
  completing,
  onAcknowledge,
  onStartComplete,
  onCancelComplete,
  onFilesChange,
  onSubmitCompletion,
}: EntryRowProps) {
  const isCompleting = completing?.handoffId === handoff.id;

  return (
    <div className={s.handoffEntry}>
      {handoff.status === 'Completed' ? (
        <div className={s.handoffDone}>
          <i className='fa-solid fa-circle-check' aria-hidden='true' />
          Completed by {handoff.completed_by} · {formatDate(handoff.completed_at ?? '')}
        </div>
      ) : (
        <div className={s.handoffActions}>
          {handoff.status === 'Pending' && (
            <button className='btn btn-secondary btn-sm' disabled={busy} onClick={onAcknowledge}>
              <i className='fa-solid fa-thumbs-up' aria-hidden='true' /> Acknowledge
            </button>
          )}
          {handoff.status === 'Acknowledged' && !isCompleting && (
            <button className='btn btn-primary btn-sm' disabled={busy} onClick={onStartComplete}>
              <i className='fa-solid fa-circle-check' aria-hidden='true' /> Complete
            </button>
          )}

          {isCompleting && (
            <div className={s.completionPanel}>
              <h4>Complete — Attach Report or Evidence</h4>
              <AttachmentField label='Report' value={completing.files} onChange={onFilesChange} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className='btn btn-secondary btn-sm'
                  disabled={busy}
                  onClick={onCancelComplete}
                >
                  Cancel
                </button>
                <button
                  className='btn btn-primary btn-sm'
                  disabled={busy}
                  onClick={onSubmitCompletion}
                >
                  {busy ? 'Submitting…' : 'Submit & Notify'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
