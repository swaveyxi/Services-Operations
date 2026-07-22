import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useServiceCall } from '@/hooks/useServiceCall';
import {
  getCampaign,
  listWorkplansForCampaign,
  acceptWorkplans,
  saveWorkplans,
  updateCampaign,
  type WorkplanInput,
} from '@/services';
import type { Campaign, ConfiguredWorkplan } from '@shared/types';
import { StatusBadge } from '@/components/StatusBadge';
import { getOpsTeam } from '@shared/constants';
import { deriveAggregateOpsStatus } from '@/utils/opsTeams';
import { formatDate } from '@/utils/format';
import s from './WorkplanView.module.css';

type ActView = {
  name: string;
  startDate: string;
  endDate: string;
  opsStartDate: string;
  opsEndDate: string;
};
type TplView = {
  id: string;
  template_id: string;
  template_name: string;
  status: string;
  activities: ActView[];
};
// Editable date state per template (keyed by template_id) used in reconfigure mode
type ActEdit = { name: string; startDate: string; endDate: string };

export default function WorkplanView() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { userName, userEmail } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [workplans, setWorkplans] = useState<TplView[]>([]);
  const [mode, setMode] = useState<'view' | 'reconfigure'>('view');
  const [editDates, setEditDates] = useState<Record<string, ActEdit[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, call] = useServiceCall();

  useEffect(() => {
    let alive = true;
    getCampaign(id).then((c) => {
      if (!alive) return;
      setCampaign(c);
      if (!c) { setLoading(false); return; }
      listWorkplansForCampaign(c.id).then((wps) => {
        if (!alive) return;
        setWorkplans(hydrate(wps));
        setLoading(false);
      });
    });
    return () => { alive = false; };
  }, [id]);

  function hydrate(wps: ConfiguredWorkplan[]): TplView[] {
    return wps
      .filter((w) => !['Not Started', 'Draft'].includes(w.status))
      .map((w) => ({
        id: w.id,
        template_id: w.template_id,
        template_name: w.template_name,
        status: w.status,
        activities: w.activities.map((a) => ({
          name: a.name,
          startDate: a.start_date || '',
          endDate: a.end_date || '',
          opsStartDate: a.ops_start_date || '',
          opsEndDate: a.ops_end_date || '',
        })),
      }));
  }

  function enterReconfigure() {
    // Seed edit state from the owner's current preset dates
    const init: Record<string, ActEdit[]> = {};
    for (const t of workplans) {
      if (t.status !== 'Amended') continue;
      init[t.template_id] = t.activities.map((a) => ({
        name: a.name,
        startDate: a.startDate,
        endDate: a.endDate,
      }));
    }
    setEditDates(init);
    setMode('reconfigure');
  }

  function editAct(tid: string, idx: number, field: 'startDate' | 'endDate', value: string) {
    setEditDates((prev) => ({
      ...prev,
      [tid]: prev[tid].map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
    }));
  }

  async function accept() {
    if (!campaign) return;
    const ids = workplans.filter((t) => t.status === 'Amended').map((t) => t.id);
    const ok = await call(() => acceptWorkplans(ids));
    if (ok === null) return;
    await refreshAggregate();
    navigate(`/tracker/${campaign.id}`);
  }

  async function resubmit() {
    if (!campaign) return;
    setError('');
    const items: WorkplanInput[] = workplans
      .filter((t) => t.status === 'Amended')
      .map((t) => {
        const acts = editDates[t.template_id] ?? [];
        return {
          template_id: t.template_id,
          template_name: t.template_name,
          activities: acts.map((a) => ({
            name: a.name,
            start_date: a.startDate,
            end_date: a.endDate,
          })),
        };
      });

    const missing = items.some((it) =>
      it.activities.some((a) => !a.start_date || !a.end_date),
    );
    if (missing) {
      setError('Every activity needs a start and end date.');
      return;
    }
    const endBeforeStart = items.some((it) =>
      it.activities.some((a) => a.start_date && a.end_date && a.end_date < a.start_date),
    );
    if (endBeforeStart) {
      setError('End date cannot be before start date for any activity.');
      return;
    }

    const saved = await call(() =>
      saveWorkplans(campaign.id, items, true, { name: userName, email: userEmail }),
    );
    if (!saved) return;
    navigate(`/tracker/${campaign.id}`);
  }

  async function refreshAggregate(): Promise<void> {
    if (!campaign) return;
    const all = await listWorkplansForCampaign(campaign.id);
    const agg = deriveAggregateOpsStatus(all.map((w) => w.status));
    if (agg === 'Accepted') {
      await updateCampaign(campaign.id, { approval_status: 'Pending' });
    }
  }

  if (loading) return <div className='loading-state'>Loading workplan…</div>;
  if (!campaign) return <div className='error-state'>Case not found.</div>;
  if (workplans.length === 0)
    return <div className='empty-state'>No submitted workplans for this case.</div>;

  const hasAmended = workplans.some((t) => t.status === 'Amended');

  return (
    <>
      <div className='page-head'>
        <div>
          <h1 className='page-title'>{mode === 'reconfigure' ? 'Reconfigure Workplan' : 'Workplan View'}</h1>
          <p className='page-sub'>
            <span className='mono' style={{ color: 'var(--c-brand)' }}>{campaign.campaign_id}</span>
          </p>
        </div>
        <button className='btn btn-secondary' onClick={() => mode === 'reconfigure' ? setMode('view') : navigate(-1)}>
          <i className='fa-solid fa-arrow-left' aria-hidden='true' /> {mode === 'reconfigure' ? 'Back to View' : 'Back'}
        </button>
      </div>

      <div className='card card-pad'>
        {mode === 'reconfigure' && (
          <div className={s.notice}>
            <i className='fa-solid fa-circle-info' aria-hidden='true' style={{ color: 'var(--t-info-fg)', marginRight: 6 }} />
            Update the dates below and submit to send your revised workplan back to the ops team for review.
          </div>
        )}

        {workplans.map((t) => {
          const isAmended = t.status === 'Amended';
          const isEditing = mode === 'reconfigure' && isAmended;
          const acts = editDates[t.template_id] ?? [];

          return (
            <div key={t.id} className={s.tpl}>
              <div className={s.tplHead}>
                <div className={s.tplMeta}>
                  <span className={s.tplName}>{t.template_name}</span>
                  <span className={s.tplTeam}>{getOpsTeam(t.template_name)}</span>
                </div>
                <StatusBadge kind='ops' value={t.status} />
              </div>
              <div className={s.tableWrap}>
                <div className='table-wrap'>
                  <table className='table'>
                    {isEditing ? (
                      <>
                        <thead>
                          <tr>
                            <th>Activity</th>
                            <th style={{ color: 'var(--t-info-fg)' }}>Ops Proposed Start</th>
                            <th style={{ color: 'var(--t-info-fg)' }}>Ops Proposed End</th>
                            <th>Your New Start</th>
                            <th>Your New End</th>
                          </tr>
                        </thead>
                        <tbody>
                          {acts.map((a, i) => (
                            <tr key={`${a.name}-${i}`}>
                              <td>{a.name}</td>
                              <td className={s.changed}>{formatDate(t.activities[i]?.opsStartDate) || '—'}</td>
                              <td className={s.changed}>{formatDate(t.activities[i]?.opsEndDate) || '—'}</td>
                              <td>
                                <input
                                  className={s.dateInput}
                                  type='date'
                                  value={a.startDate}
                                  onChange={(e) => editAct(t.template_id, i, 'startDate', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  className={s.dateInput}
                                  type='date'
                                  value={a.endDate}
                                  min={a.startDate || undefined}
                                  onChange={(e) => editAct(t.template_id, i, 'endDate', e.target.value)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    ) : (
                      <>
                        <thead>
                          <tr>
                            <th>Activity</th>
                            <th>Your Start</th>
                            <th>Your End</th>
                            {isAmended && <th style={{ color: 'var(--t-info-fg)' }}>Ops Start</th>}
                            {isAmended && <th style={{ color: 'var(--t-info-fg)' }}>Ops End</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {t.activities.map((a, i) => {
                            const startChanged = isAmended && !!a.opsStartDate && a.opsStartDate !== a.startDate;
                            const endChanged = isAmended && !!a.opsEndDate && a.opsEndDate !== a.endDate;
                            return (
                              <tr key={`${a.name}-${i}`}>
                                <td>{a.name}</td>
                                <td className={s.preset}>{formatDate(a.startDate) || '—'}</td>
                                <td className={s.preset}>{formatDate(a.endDate) || '—'}</td>
                                {isAmended && (
                                  <td className={startChanged ? s.changed : s.preset}>
                                    {formatDate(a.opsStartDate) || '—'}
                                  </td>
                                )}
                                {isAmended && (
                                  <td className={endChanged ? s.changed : s.preset}>
                                    {formatDate(a.opsEndDate) || '—'}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </>
                    )}
                  </table>
                </div>
              </div>
            </div>
          );
        })}

        {error && <p className='field-error' style={{ marginTop: 8 }}>{error}</p>}

        {/* View mode footer — only when Amended workplans exist */}
        {mode === 'view' && hasAmended && (
          <div className={s.footer}>
            <button className='btn btn-secondary' onClick={enterReconfigure} disabled={saving}>
              <i className='fa-solid fa-pen' aria-hidden='true' /> Reconfigure & Resubmit
            </button>
            <button className='btn btn-success' onClick={accept} disabled={saving}>
              <i className='fa-solid fa-check' aria-hidden='true' /> Accept Ops Dates
            </button>
          </div>
        )}

        {/* Reconfigure mode footer */}
        {mode === 'reconfigure' && (
          <div className={s.footer}>
            <button className='btn btn-secondary' onClick={() => setMode('view')} disabled={saving}>
              Cancel
            </button>
            <button className='btn btn-primary' onClick={resubmit} disabled={saving}>
              {saving ? 'Saving…' : 'Save & Submit'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
