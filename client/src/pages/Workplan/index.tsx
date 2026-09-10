import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useServiceCall } from '@/hooks/useServiceCall';
import {
  getCampaign,
  getTemplates,
  listWorkplansForCampaign,
  saveWorkplans,
  updateCampaign,
  type WorkplanInput,
} from '@/services';
import type {
  Campaign,
  WorkplanTemplate,
  ConfiguredWorkplan,
} from '@shared/types';
import { StatusBadge } from '@/components/StatusBadge';
import { getOpsTeam } from '@shared/constants';
import s from './Workplan.module.css';

type ActState = {
  name: string;
  startDate: string;
  endDate: string;
  selected: boolean;
};
type TplState = {
  template_name: string;
  status: string;
  activities: ActState[];
};

export default function Workplan() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { userName, userEmail } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [templates, setTemplates] = useState<WorkplanTemplate[]>([]);
  const [selected, setSelected] = useState<Record<string, TplState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, call] = useServiceCall();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getCampaign(id).then((camp) => {
      if (!active) return;
      setCampaign(camp);
      if (!camp) {
        setLoading(false);
        return;
      }
      Promise.all([
        getTemplates(),
        listWorkplansForCampaign(camp.id),
      ]).then(([tpls, existing]) => {
        if (!active) return;
        setTemplates(tpls);
        setSelected(hydrate(existing));
        setLoading(false);
      });
    });
    return () => {
      active = false;
    };
  }, [id]);

  function hydrate(existing: ConfiguredWorkplan[]): Record<string, TplState> {
    const state: Record<string, TplState> = {};
    for (const w of existing) {
      state[w.template_id] = {
        template_name: w.template_name,
        status: w.status,
        activities: w.activities.map((a) => ({
          name: a.name,
          startDate: a.start_date || '',
          endDate: a.end_date || '',
          selected: true,
        })),
      };
    }
    return state;
  }

  function toggleTemplate(t: WorkplanTemplate) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[t.template_id]) {
        if (['Accepted', 'Amended', 'Submitted', 'Pending Review'].includes(next[t.template_id].status)) return prev;
        delete next[t.template_id];
      } else {
        next[t.template_id] = {
          template_name: t.template_name,
          status: 'Not Started',
          activities: t.activities.map((a) => ({
            name: a.name,
            startDate: '',
            endDate: '',
            selected: true,
          })),
        };
      }
      return next;
    });
  }

  function editActivity(tid: string, idx: number, patch: Partial<ActState>) {
    setSelected((prev) => {
      const tpl = prev[tid];
      if (!tpl) return prev;
      const activities = tpl.activities.map((a, i) =>
        i === idx ? { ...a, ...patch } : a,
      );
      return { ...prev, [tid]: { ...tpl, activities } };
    });
  }

  function toggleAllActivities(tid: string, checked: boolean) {
    setSelected((prev) => {
      const tpl = prev[tid];
      if (!tpl) return prev;
      return {
        ...prev,
        [tid]: {
          ...tpl,
          activities: tpl.activities.map((a) => ({ ...a, selected: checked })),
        },
      };
    });
  }

  async function save(submit: boolean) {
    if (!campaign) return;
    setError('');
    const items: WorkplanInput[] = Object.entries(selected)
      .filter(([, tpl]) => ['Not Started', 'Draft', 'Amended'].includes(tpl.status))
      .map(([template_id, tpl]) => ({
        template_id,
        template_name: tpl.template_name,
        activities: tpl.activities
          .filter((a) => a.selected)
          .map((a) => ({
            name: a.name,
            start_date: a.startDate,
            end_date: a.endDate,
          })),
      }));

    if (submit) {
      if (campaign.profitability.total_revenue <= 0) {
        setError('Save commercials for this case in Tracker before submitting the workplan.');
        return;
      }
      if (items.length === 0) {
        setError('Select at least one new workplan template to submit.');
        return;
      }
      const missing = items.some((it) =>
        it.activities.some((a) => !a.start_date || !a.end_date),
      );
      if (missing) {
        setError(
          'Every selected activity needs a start and end date before submitting.',
        );
        return;
      }
      const endBeforeStart = items.some((it) =>
        it.activities.some(
          (a) => a.start_date && a.end_date && a.end_date < a.start_date,
        ),
      );
      if (endBeforeStart) {
        setError('End date cannot be before the start date for any activity.');
        return;
      }
    }

    const saved = await call(() =>
      saveWorkplans(campaign.id, items, submit, { name: userName, email: userEmail }),
    );
    if (!saved) return;
    const patch: Partial<Campaign> = {};
    if (submit) {
      patch.campaign_status = 'Pending';
    }
    await call(() => updateCampaign(campaign.id, patch));
    navigate(`/tracker/${campaign.id}`);
  }

  if (loading) return <div className='loading-state'>Loading workplan…</div>;
  if (!campaign) return <div className='error-state'>Case not found.</div>;
  if (campaign.is_archived) {
    return (
      <div className='error-state'>
        This case is archived and read-only.{' '}
        <button className='btn btn-secondary' onClick={() => navigate(`/tracker/${campaign.id}`)}>
          Back to Case
        </button>
      </div>
    );
  }

  const selectedEntries = Object.entries(selected);
  // Only Draft / Not Started are editable here; Amended workplans are handled on /workplan-view
  const configurableEntries = selectedEntries.filter(
    ([, tpl]) => ['Not Started', 'Draft'].includes(tpl.status),
  );

  return (
    <>
      <div className='page-head'>
        <div>
          <h1 className='page-title'>Configure Workplan</h1>
          <p className='page-sub'>
            <span className='mono' style={{ color: 'var(--c-brand)' }}>
              {campaign.campaign_id}
            </span>
          </p>
        </div>
        <button
          className='btn btn-secondary'
          onClick={() => navigate(`/tracker/${campaign.id}`)}
        >
          <i className='fa-solid fa-arrow-left' aria-hidden='true' /> Back
        </button>
      </div>

      {/* Template picker */}
      <div className='card card-pad' style={{ marginBottom: 'var(--space-5)' }}>
        <div className='section-head'>
          <h2 className='section-title'>Workplan Templates</h2>
          <span className='muted' style={{ fontSize: '0.8rem' }}>
            {configurableEntries.length} selected
          </span>
        </div>
        <div className={s.grid}>
          {templates.map((t) => {
            const sel = selected[t.template_id];
            const isSubmitted = !!sel && !['Not Started', 'Draft', 'Amended'].includes(sel.status);
            const isAmended = !!sel && sel.status === 'Amended';
            const isActive = !!sel && !isSubmitted;
            const isLocked = isSubmitted || isAmended;
            return (
              <div
                key={t.template_id}
                className={`${s.tplCard} ${isActive ? s.active : ''} ${isSubmitted ? s.submitted : ''}`}
                onClick={() => !isLocked && toggleTemplate(t)}
              >
                <div className={s.tplName}>{t.template_name}</div>
                <span className={`badge badge--neutral ${s.tplTeamBadge}`}>
                  {getOpsTeam(t.template_name)}
                </span>
                {isSubmitted && (
                  <div className={s.lockBadge}>
                    <i className='fa-solid fa-paper-plane' aria-hidden='true' />{' '}
                    Submitted
                  </div>
                )}
                {isAmended && (
                  <div className={s.lockBadge} style={{ color: 'var(--t-info-fg)' }}>
                    <i className='fa-solid fa-pen' aria-hidden='true' />{' '}
                    Amended
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Configurable activities — submitted templates are excluded */}
      {configurableEntries.length > 0 && (
        <div className='card card-pad'>
          <div className='section-head'>
            <h2 className='section-title'>Configure Activities</h2>
            <span className='muted' style={{ fontSize: '0.8rem' }}>
              {configurableEntries.length} template{' '}
              {configurableEntries.length !== 1 ? 's' : ''}
            </span>
          </div>
          {configurableEntries.map(([tid, tpl]) => {
            const locked = false;
            return (
              <div key={tid} className={s.tplBlock}>
                <div className={s.tplBlockHead}>
                  <span className={s.tplBlockName}>{tpl.template_name}</span>
                  <StatusBadge kind='ops' value={tpl.status} />
                </div>
                <div className={s.actTable}>
                  <div className={s.actHeadRow}>
                    <input
                      type='checkbox'
                      disabled={locked}
                      checked={tpl.activities.every((a) => a.selected)}
                      ref={(el) => {
                        if (el)
                          el.indeterminate =
                            tpl.activities.some((a) => a.selected) &&
                            !tpl.activities.every((a) => a.selected);
                      }}
                      onChange={(e) =>
                        toggleAllActivities(tid, e.target.checked)
                      }
                    />
                    <span className='eyebrow'>Activity</span>
                    <span className='eyebrow'>Start</span>
                    <span className='eyebrow'>End</span>
                  </div>
                  {tpl.activities.map((a, i) => (
                    <div key={`${a.name}-${i}`} className={s.actRow}>
                      <input
                        type='checkbox'
                        checked={a.selected}
                        disabled={locked}
                        onChange={(e) =>
                          editActivity(tid, i, { selected: e.target.checked })
                        }
                      />
                      <span
                        className={`${s.actName} ${a.selected ? '' : s.off}`}
                      >
                        {a.name}
                      </span>
                      <input
                        className={s.dateInput}
                        type='date'
                        value={a.startDate}
                        disabled={locked || !a.selected}
                        onChange={(e) =>
                          editActivity(tid, i, { startDate: e.target.value })
                        }
                      />
                      <input
                        className={s.dateInput}
                        type='date'
                        value={a.endDate}
                        min={a.startDate || undefined}
                        disabled={locked || !a.selected}
                        onChange={(e) =>
                          editActivity(tid, i, { endDate: e.target.value })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {error && (
            <p className='field-error' style={{ marginTop: 4 }}>
              {error}
            </p>
          )}

          <div className={s.footer}>
            <button
              className='btn btn-secondary'
              onClick={() => save(false)}
              disabled={saving}
            >
              Save as Draft
            </button>
            <button
              className='btn btn-primary'
              onClick={() => save(true)}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save & Submit'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
