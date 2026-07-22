import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useServiceCall } from '@/hooks/useServiceCall';
import { getFormById, acknowledgeForm, completeForm, handoffForm } from '@/services';
import type { SupportForm, OneDriveFile } from '@shared/types';
import { FormDetailBody } from '@/components/FormDetailBody';
import { AttachmentField } from '@/components/AttachmentField';
import { FORM_CATALOG_META, FORM_TITLE_TO_KEY, HANDOFF_DEFAULTS } from '@shared/constants';
import { TEAMS } from '@/services/teams';
import { formatDate } from '@/utils/format';
import type { TeamOutletContext } from './Team';
import s from './Operations.module.css';

export default function FormPanel() {
  const { formId = '' } = useParams();
  const { forms, campaignMap, userMap, onFormChanged } = useOutletContext<TeamOutletContext>();
  const { userName } = useAuth();

  const [form, setForm] = useState<SupportForm | null>(
    () => forms.find((f) => f.id === formId) ?? null,
  );
  const [busy, call] = useServiceCall();

  /* Handoff panel state */
  const [handing, setHanding] = useState(false);
  const [handoffTeam, setHandoffTeam] = useState('');
  const [handoffFiles, setHandoffFiles] = useState<OneDriveFile[]>([]);

  /* Completion panel state */
  const [completing, setCompleting] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<OneDriveFile[]>([]);

  useEffect(() => {
    const found = forms.find((f) => f.id === formId);
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
  }, [formId, forms]);

  function update(updated: SupportForm) {
    setForm(updated);
    onFormChanged(updated);
  }

  async function acknowledge() {
    if (!form) return;
    const updated = await call(() => acknowledgeForm(form.id, userName));
    if (updated) update(updated);
  }

  function openHandoff() {
    const catalogKey = FORM_TITLE_TO_KEY[form?.form_type ?? ''] ?? '';
    setHandoffTeam(HANDOFF_DEFAULTS[catalogKey] ?? '');
    setHanding(true);
  }

  async function submitHandoff() {
    if (!form || !handoffTeam.trim()) return;
    const attachment = handoffFiles.length ? handoffFiles : null;
    const updated = await call(() => handoffForm(form.id, userName, handoffTeam, attachment));
    if (updated) {
      update(updated);
      setHanding(false);
      setHandoffTeam('');
      setHandoffFiles([]);
    }
  }

  async function submitCompletion() {
    if (!form) return;
    const evidence = evidenceFiles.length ? evidenceFiles : null;
    const updated = await call(() => completeForm(form.id, userName, completionNote, evidence));
    if (updated) {
      update(updated);
      setCompleting(false);
      setCompletionNote('');
      setEvidenceFiles([]);
    }
  }

  const isDelivered = form?.delivery_status === 'Delivered';
  const isAcknowledged = form?.delivery_status === 'Acknowledged';
  const isCompleted = form?.delivery_status === 'Completed';
  const activeHandoffs = form?.handoffs.filter((h) => h.status !== 'Completed') ?? [];
  const isHandoffComplete = (form?.handoffs.length ?? 0) > 0 && activeHandoffs.length === 0;

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
            Form not found.
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

          {handing && (
            <div className={s.completionPanel}>
              <h4>Hand Off to Team</h4>
              <div className='field'>
                <label className='field-label'>Receiving Team</label>
                <select
                  className='select'
                  value={handoffTeam}
                  onChange={(e) => setHandoffTeam(e.target.value)}
                >
                  <option value=''>Select a team…</option>
                  {TEAMS.filter((t) => t.name !== form.operations_team).map((t) => (
                    <option key={t.key} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <AttachmentField label='Attachment' value={handoffFiles} onChange={setHandoffFiles} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className='btn btn-secondary btn-sm'
                  onClick={() => setHanding(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className='btn btn-primary btn-sm'
                  onClick={submitHandoff}
                  disabled={busy || !handoffTeam.trim()}
                >
                  {busy ? 'Sending…' : 'Send Handoff'}
                </button>
              </div>
            </div>
          )}

          {completing && (
            <div className={s.completionPanel}>
              <h4>Mark as Completed</h4>
              <div className='field'>
                <label className='field-label'>Completion Note</label>
                <textarea
                  className='textarea'
                  rows={3}
                  placeholder='Describe what was delivered…'
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                />
              </div>
              <AttachmentField label='Report' value={evidenceFiles} onChange={setEvidenceFiles} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className='btn btn-secondary btn-sm'
                  onClick={() => setCompleting(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className='btn btn-primary btn-sm'
                  onClick={submitCompletion}
                  disabled={busy}
                >
                  {busy ? 'Saving…' : 'Submit Completion'}
                </button>
              </div>
            </div>
          )}

          <div className={s.actionBar}>
            {isDelivered && (
              <button className='btn btn-success' onClick={acknowledge} disabled={busy}>
                <i className='fa-solid fa-check' aria-hidden='true' /> Acknowledge
              </button>
            )}
            {(isDelivered || isAcknowledged) && !handing && (
              <>
                {isHandoffComplete && (
                  <span
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--t-positive-fg)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600,
                    }}
                  >
                    <i className='fa-solid fa-circle-check' aria-hidden='true' />
                    All Jobs complete
                  </span>
                )}
                <button className='btn btn-secondary' onClick={openHandoff} disabled={busy}>
                  <i className='fa-solid fa-arrow-right-to-bracket' aria-hidden='true' /> Hand Off
                </button>
              </>
            )}
            {isAcknowledged && !isCompleted && !completing && !handing && (
              <button
                className='btn btn-primary'
                onClick={() => setCompleting(true)}
                disabled={busy}
              >
                <i className='fa-solid fa-circle-check' aria-hidden='true' /> Complete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
