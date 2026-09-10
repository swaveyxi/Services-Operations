import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { useServiceCall } from '@/hooks/useServiceCall';
import {
  getCampaign,
  listWorkplansForCampaign,
  acceptWorkplans,
  amendWorkplan,
  updateCampaign,
  listUsers,
} from '@/services';
import { useUserTeams } from '@/hooks/useUserTeams';
import type { Campaign, ConfiguredWorkplan, Activity } from '@shared/types';
import { StatusBadge } from '@/components/StatusBadge';
import { getOpsTeam } from '@shared/constants';
import { deriveAggregateOpsStatus } from '@/utils/opsTeams';
import { formatDate } from '@/utils/format';
import s from './WorkplanReview.module.css';

type ActRow = {
  name: string;
  presetStart: string;
  presetEnd: string;
  opsStart: string;
  opsEnd: string;
};
type TplRow = {
  id: string;
  template_name: string;
  status: string;
  activities: ActRow[];
  created_at: string;
};

export default function WorkplanReview() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [rows, setRows] = useState<TplRow[]>([]);
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saving, call] = useServiceCall();

  const myTeams = useUserTeams();
  const userTeamNames = useMemo(() => myTeams.map((t) => t.name), [myTeams]);

  useEffect(() => {
    let alive = true;
    getCampaign(id)
      .then((c) => {
        if (!alive) return;
        setCampaign(c);
        if (!c) { setLoading(false); return; }
        listUsers().then((users) => {
          if (!alive) return;
          setOwnerName(users.find((u) => u.id === c.owner_user_id)?.name ?? '');
        });
        listWorkplansForCampaign(c.id).then((wps) => {
          if (!alive) return;
          setRows(hydrate(wps));
          setLoading(false);
        });
      })
      .catch((err) => {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : 'Case not found.');
        setLoading(false);
      });
    return () => { alive = false; };
  }, [id]);

  function hydrate(wps: ConfiguredWorkplan[]): TplRow[] {
    return wps.map((w) => ({
      id: w.id,
      template_name: w.template_name,
      status: w.status,
      created_at: w.created_at,
      activities: w.activities.map((a) => ({
        name: a.name,
        presetStart: a.start_date || '',
        presetEnd: a.end_date || '',
        opsStart: a.ops_start_date || a.start_date || '',
        opsEnd: a.ops_end_date || a.end_date || '',
      })),
    }));
  }

  const submittedOn = rows.length
    ? rows.reduce((earliest, r) => (Date.parse(r.created_at) < Date.parse(earliest) ? r.created_at : earliest), rows[0].created_at)
    : null;

  // Draft means the case owner hasn't submitted it yet — ops has nothing to
  // review or act on until then, so it never belongs in this page's rows.
  const opsRows = rows.filter(
    (t) => userTeamNames.includes(getOpsTeam(t.template_name)) && t.status !== 'Draft',
  );
  const isOpsReviewer = opsRows.length > 0;
  const actionRows = opsRows;

  // Group by team for display — user may be on multiple teams, each gets its own panel
  const teamGroups: { teamName: string; rows: TplRow[] }[] = [];
  for (const row of opsRows) {
    const teamName = getOpsTeam(row.template_name);
    const existing = teamGroups.find((g) => g.teamName === teamName);
    if (existing) existing.rows.push(row);
    else teamGroups.push({ teamName, rows: [row] });
  }

  function editOps(tid: string, idx: number, field: 'opsStart' | 'opsEnd', value: string) {
    setRows((prev) =>
      prev.map((t) =>
        t.id !== tid ? t : {
          ...t,
          activities: t.activities.map((a, i) => i === idx ? { ...a, [field]: value } : a),
        },
      ),
    );
  }

  function validateDates(): boolean {
    const ok = actionRows
      .filter((t) => t.status !== 'Accepted')
      .every((t) => t.activities.every((a) => a.opsStart && a.opsEnd));
    if (!ok) setError('Every activity needs a start and end date.');
    return ok;
  }

  async function refresh(): Promise<void> {
    if (!campaign) return;
    const all = await listWorkplansForCampaign(campaign.id);
    const agg = deriveAggregateOpsStatus(all.map((w) => w.status));
    if (agg === 'Accepted') {
      await updateCampaign(campaign.id, { approval_status: 'Pending' });
    }
    setRows(hydrate(all));
  }

  async function accept() {
    setError('');
    if (!validateDates()) return;
    const hasCustomDates = actionRows
      .filter((t) => t.status !== 'Accepted')
      .some((t) => t.activities.some((a) => a.opsStart !== a.presetStart || a.opsEnd !== a.presetEnd));
    if (hasCustomDates) {
      showToast('Your date changes will not be saved — use Counter to propose different dates.', 'warning');
    }
    const ids = actionRows.filter((t) => t.status !== 'Accepted').map((t) => t.id);
    const ok = await call(() => acceptWorkplans(ids));
    if (ok === null) return;
    await call(() => refresh());
  }

  async function counter() {
    setError('');
    if (!validateDates()) return;
    for (const t of actionRows) {
      if (t.status === 'Accepted') continue;
      const changed = t.activities.some(
        (a) => a.opsStart !== a.presetStart || a.opsEnd !== a.presetEnd,
      );
      const activities: Activity[] = t.activities.map((a) => ({
        name: a.name,
        start_date: a.presetStart,
        end_date: a.presetEnd,
        ops_start_date: a.opsStart,
        ops_end_date: a.opsEnd,
      }));
      const ok = await call(() => amendWorkplan(t.id, activities, changed));
      if (ok === null) return;
    }
    await call(() => refresh());
  }

  if (loading) return <div className='loading-state'>Loading workplan…</div>;
  if (!campaign) return <div className='error-state'>{loadError || 'Case not found.'}</div>;
  if (!isOpsReviewer)
    return <div className='empty-state'>You don't have access to review this workplan.</div>;

  return (
    <>
      <div className='page-head'>
        <div>
          <h1 className='page-title'>Workplan Review</h1>
          <p className='page-sub'>
            <span className='mono' style={{ color: 'var(--c-brand)' }}>{campaign.campaign_id}</span>
            {ownerName && <> · Submitted by {ownerName}</>}
            {submittedOn && <> · {formatDate(submittedOn)}</>}
          </p>
        </div>
        <button className='btn btn-secondary' onClick={() => navigate(-1)}>
          <i className='fa-solid fa-arrow-left' aria-hidden='true' /> Back
        </button>
      </div>

      {teamGroups.map(({ teamName, rows: teamRows }) => {
        const groupAllAccepted = teamRows.every((t) => t.status === 'Accepted');
        const groupPending = teamRows.filter((t) => ['Submitted', 'Pending Review'].includes(t.status));
        // "Counter sent" only makes sense once ops has actually sent one —
        // require an Amended row, don't infer it from the mere absence of
        // pending ones (which was also true for never-submitted Draft rows).
        const groupAwaitingOwner =
          !groupAllAccepted && groupPending.length === 0 && teamRows.some((t) => t.status === 'Amended');

        return (
          <section key={teamName} className={s.panel}>
            <div className={s.panelHead}>
              <div className={s.panelTitle}>
                <i className='fa-solid fa-clipboard-check' aria-hidden='true' />
                {teamName} Review
              </div>
              <span className={s.panelSub}>Set operational dates and accept or counter the workplan</span>
            </div>

            <>
              {teamRows.map((t) => {
                const locked = t.status === 'Accepted' || t.status === 'Amended';
                return (
                  <div key={t.id} className={s.tpl}>
                    <div className={s.tplHead}>
                      <div>
                        <div className={s.tplName}>{t.template_name}</div>
                      </div>
                      <StatusBadge kind='ops' value={t.status} />
                    </div>
                    <div className='table-wrap'>
                      <table className='table'>
                        <thead>
                          <tr>
                            <th>Activity</th>
                            <th>Preset Start</th>
                            <th>Preset End</th>
                            <th>Ops Start</th>
                            <th>Ops End</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.activities.map((a, i) => {
                            const startChanged = a.opsStart !== a.presetStart;
                            const endChanged = a.opsEnd !== a.presetEnd;
                            return (
                              <tr key={`${a.name}-${i}`}>
                                <td>{a.name}</td>
                                <td className={s.preset}>{formatDate(a.presetStart) || '—'}</td>
                                <td className={s.preset}>{formatDate(a.presetEnd) || '—'}</td>
                                <td className={startChanged && !locked ? s.changed : ''}>
                                  {locked ? (
                                    <span className={s.preset}>{formatDate(a.opsStart) || '—'}</span>
                                  ) : (
                                    <input
                                      className={s.dateInput}
                                      type='date'
                                      value={a.opsStart}
                                      onChange={(e) => editOps(t.id, i, 'opsStart', e.target.value)}
                                    />
                                  )}
                                </td>
                                <td className={endChanged && !locked ? s.changed : ''}>
                                  {locked ? (
                                    <span className={s.preset}>{formatDate(a.opsEnd) || '—'}</span>
                                  ) : (
                                    <input
                                      className={s.dateInput}
                                      type='date'
                                      value={a.opsEnd}
                                      onChange={(e) => editOps(t.id, i, 'opsEnd', e.target.value)}
                                    />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {error && <p className='field-error' style={{ marginTop: 8 }}>{error}</p>}

              {groupAllAccepted ? (
                <div className={s.notice} style={{ marginTop: 'var(--space-4)' }}>
                  <i className='fa-solid fa-circle-check' aria-hidden='true' style={{ color: 'var(--t-positive-fg)' }} />
                  All templates accepted.
                </div>
              ) : groupAwaitingOwner ? (
                <div className={s.notice} style={{ marginTop: 'var(--space-4)' }}>
                  <i className='fa-solid fa-clock' aria-hidden='true' style={{ color: 'var(--t-pending-fg)' }} />
                  Counter sent — awaiting the case owner's response.
                </div>
              ) : (
                <div className={s.footer}>
                  <button className='btn btn-secondary' onClick={counter} disabled={saving}>
                    <i className='fa-solid fa-reply' aria-hidden='true' /> Send Counter
                  </button>
                  <button className='btn btn-success' onClick={accept} disabled={saving}>
                    <i className='fa-solid fa-check' aria-hidden='true' /> Accept
                  </button>
                </div>
              )}
            </>
          </section>
        );
      })}
    </>
  );
}
