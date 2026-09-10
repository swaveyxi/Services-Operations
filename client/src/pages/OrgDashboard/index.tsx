import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  listCampaigns,
  listAllWorkplans,
  listAllForms,
  listUsers,
  getClientById,
} from '@/services';
import type {
  Campaign,
  ConfiguredWorkplan,
  SupportForm,
  ClientContact,
  OpsUser,
} from '@shared/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Pager } from '@/components/Pager';
import { Modal } from '@/components/Modal';
import { FormDetailBody } from '@/components/FormDetailBody';
import {
  BUSINESS_UNITS,
  CAMPAIGN_STATUSES,
  getOpsTeam,
  FORM_CATALOG_META,
  FORM_TITLE_TO_KEY,
  OPERATIONS_ROLE,
  OPERATIONS_ADMIN_ROLE,
  SUPER_ADMIN_ROLE,
} from '@shared/constants';
import { ciEq, formatDate, formatCurrency, titleCase } from '@/utils/format';
import { toCampaignDisplayStatus } from '@/utils/status';
import { computeProfitability } from '@/utils/profitability';
import s from './OrgDashboard.module.css';

const PAGE = 5;

export default function Admin() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const canAccess =
    hasRole(OPERATIONS_ROLE) || hasRole(OPERATIONS_ADMIN_ROLE) || hasRole(SUPER_ADMIN_ROLE);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [workplans, setWorkplans] = useState<ConfiguredWorkplan[]>([]);
  const [forms, setForms] = useState<SupportForm[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, ClientContact>>({});
  const [userMap, setUserMap] = useState<Record<string, OpsUser>>({});
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [unit, setUnit] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<SupportForm | null>(null);
  const [activeWorkplan, setActiveWorkplan] = useState<ConfiguredWorkplan | null>(null);
  const [commercials, setCommercials] = useState<Campaign | null>(null);

  useEffect(() => {
    if (!canAccess) {
      void navigate('/', { replace: true });
      return;
    }
    Promise.all([listCampaigns(), listAllWorkplans(), listAllForms(), listUsers()]).then(
      async ([c, w, f, users]) => {
        setCampaigns(c);
        setWorkplans(w);
        setForms(f);
        setUserMap(Object.fromEntries(users.map((u) => [u.id, u])));
        const uniqueClientIds = [...new Set(c.map((x) => x.client_id).filter(Boolean))] as string[];
        const clientEntries = await Promise.all(
          uniqueClientIds.map((id) =>
            getClientById(id).then((cl) => (cl ? ([id, cl] as const) : null)),
          ),
        );
        setClientMap(
          Object.fromEntries(clientEntries.filter(Boolean) as [string, ClientContact][]),
        );
        setLoading(false);
      },
    );
  }, [canAccess, navigate]);

  const stats = useMemo(
    () => ({
      total: campaigns.length,
      active: campaigns.filter((c) => ciEq(c.campaign_status, 'Active')).length,
      pending: campaigns.filter((c) => ciEq(c.approval_status ?? '', 'Pending')).length,
      approved: campaigns.filter((c) => ciEq(c.approval_status ?? '', 'Approved')).length,
    }),
    [campaigns],
  );

  const filtered = useMemo(() => {
    const n = q.toLowerCase().trim();
    return campaigns.filter((c) => {
      const mq = !n || [c.campaign_id].some((v) => (v || '').toLowerCase().includes(n));
      const mu = !unit || ciEq(c.unit, unit);
      const ms = !status || ciEq(toCampaignDisplayStatus(c.campaign_status, c.approval_status), status);
      return mq && mu && ms;
    });
  }, [campaigns, q, unit, status]);

  useEffect(() => setPage(1), [q, unit, status]);
  const pageItems = filtered.slice((page - 1) * PAGE, page * PAGE);

  if (!canAccess) return null;
  if (loading) return <div className='loading-state'>Loading dashboard…</div>;

  return (
    <>
      <div className='page-head'>
        <div>
          <h1 className='page-title'>Org Dashboard</h1>
          <p className='page-sub'>All business cases across teams and units.</p>
        </div>
      </div>

      <div className={s.stats}>
        <Stat value={stats.total} label='Total Cases' />
        <Stat value={stats.active} label='Active' />
        <Stat value={stats.pending} label='Pending Approval' />
        <Stat value={stats.approved} label='Approved' />
      </div>

      <div className={s.filters}>
        <input
          className='input'
          style={{ flex: 1, minWidth: 220 }}
          placeholder='Search client or campaign ID…'
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className='select'
          style={{ width: 'auto' }}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        >
          <option value=''>All Business Units</option>
          {BUSINESS_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select
          className='select'
          style={{ width: 'auto' }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value=''>All Statuses</option>
          {CAMPAIGN_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className='empty-state'>No cases match your filters.</div>
      ) : (
        <>
          {pageItems.map((c) => {
            const wps = workplans.filter((w) => w.campaign_id === c.id);
            const cforms = forms.filter((f) => f.campaign_id === c.id);
            const open = openId === c.id;
            return (
              <div key={c.id} className={`${s.row} ${open ? s.open : ''}`}>
                <div className={s.head} onClick={() => setOpenId(open ? null : c.id)}>
                  <i className={`fa-solid fa-chevron-right ${s.chev}`} aria-hidden='true' />
                  <div>
                    <div className={s.cid}>{c.campaign_id}</div>
                    <div className={s.client}>
                      {c.client_id ? (clientMap[c.client_id]?.display_name ?? '—') : '—'}
                    </div>
                    <div className={s.created}>Created {formatDate(c.created_at)}</div>
                  </div>
                  <div className={s.col}>
                    <span className={s.colLabel}>Owner</span>
                    <span className={s.colVal}>{userMap[c.owner_user_id]?.name ?? '—'}</span>
                  </div>
                  <div className={s.col}>
                    <span className={s.colLabel}>Unit</span>
                    <span className={s.colVal}>{c.unit || '—'}</span>
                  </div>
                  <div className={s.col}>
                    <span className={s.colLabel}>Campaign Status</span>
                    <StatusBadge
                      kind='campaign'
                      value={toCampaignDisplayStatus(c.campaign_status, c.approval_status)}
                    />
                  </div>
                  <div className={s.col}>
                    <span className={s.colLabel}>Configations</span>
                    <span className={s.colVal}>
                      {wps.length} workplans · {cforms.length} forms
                    </span>
                  </div>
                  <div className={s.col}>
                    <span className={s.colLabel}>Profitability</span>
                    <StatusBadge kind='approval' value={c.approval_status ?? 'Not Started'} />
                  </div>
                </div>

                {open && (
                  <div className={s.expand}>
                    <div className={s.panelGrid}>
                      <div>
                        <div className='eyebrow' style={{ marginBottom: 8 }}>
                          <i className='fa-solid fa-diagram-project' aria-hidden='true' /> Workplans
                        </div>
                        {wps.length === 0 ? (
                          <p className='muted'>No workplans configured.</p>
                        ) : (
                          wps.map((w) => (
                            <div
                              key={w.id}
                              className={`${s.item} ${s.itemClickable}`}
                              onClick={() => setActiveWorkplan(w)}
                            >
                              <div>
                                <div style={{ fontWeight: 600 }}>{w.template_name}</div>
                                <div className='muted' style={{ fontSize: '0.74rem' }}>
                                  {getOpsTeam(w.template_name)} · configured{' '}
                                  {formatDate(w.created_at)}
                                </div>
                              </div>
                              <StatusBadge kind='ops' value={w.status} />
                            </div>
                          ))
                        )}
                      </div>
                      <div>
                        <div className='eyebrow' style={{ marginBottom: 8 }}>
                          <i className='fa-solid fa-file-lines' aria-hidden='true' /> Support Forms
                        </div>
                        {cforms.length === 0 ? (
                          <p className='muted'>No forms submitted.</p>
                        ) : (
                          cforms.map((f) => {
                            const title =
                              FORM_CATALOG_META[FORM_TITLE_TO_KEY[f.form_type]]?.title ||
                              f.form_type;
                            return (
                              <div
                                key={f.id}
                                className={`${s.item} ${s.itemClickable}`}
                                onClick={() => setActiveForm(f)}
                              >
                                <span>{title}</span>
                                <StatusBadge
                                  kind='delivery'
                                  value={f.delivery_status}
                                  submittedOn={f.submitted_on}
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <div className={s.trigger}>
                      <button
                        className='btn btn-secondary btn-sm'
                        onClick={() => setCommercials(c)}
                      >
                        <i className='fa-solid fa-chart-line' aria-hidden='true' /> View
                        Profitability Report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <Pager
            page={page}
            pageSize={PAGE}
            totalItems={filtered.length}
            noun='cases'
            onPage={setPage}
          />
        </>
      )}

      {activeForm && (
        <Modal
          title={
            FORM_CATALOG_META[FORM_TITLE_TO_KEY[activeForm.form_type]]?.title ||
            activeForm.form_type
          }
          onClose={() => setActiveForm(null)}
          footer={
            <button className='btn btn-secondary' onClick={() => setActiveForm(null)}>
              Close
            </button>
          }
        >
          <FormDetailBody
            form={activeForm}
            campaignLabel={campaigns.find((c) => c.id === activeForm.campaign_id)?.campaign_id}
          />
        </Modal>
      )}

      {activeWorkplan && (
        <WorkplanModal workplan={activeWorkplan} onClose={() => setActiveWorkplan(null)} />
      )}

      {commercials && (
        <CommercialsModal campaign={commercials} onClose={() => setCommercials(null)} />
      )}
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className={s.stat}>
      <div className={s.statVal}>{value}</div>
      <div className={s.statLabel}>{label}</div>
    </div>
  );
}

function CommercialsModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const p = computeProfitability(campaign.revenue_items ?? [], campaign.cost_items ?? []);
  const itemList = (title: string, items: Campaign['revenue_items'] = []) => (
    <div>
      <div className='eyebrow' style={{ marginBottom: 8 }}>
        {title} ({items.length})
      </div>
      {items.length === 0 ? (
        <p className='muted'>None.</p>
      ) : (
        items.map((it, i) => (
          <div key={`${it.service_name}-${i}`} className={s.item}>
            <span style={{ flex: 1 }}>{it.service_name}</span>
            <div style={{ textAlign: 'right' }}>
              <div className='mono'>{formatCurrency((it.rate || 0) * (it.quantity || 0))}</div>
              <div className='muted' style={{ fontSize: '0.75rem', marginTop: 2 }}>
                price: {formatCurrency(it.rate || 0)} x qty: {it.quantity || 0}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
  return (
    <Modal
      title={`Profitability — ${campaign.campaign_id}`}
      onClose={onClose}
      width={760}
      footer={
        <button className='btn btn-secondary' onClick={onClose}>
          Close
        </button>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Mini label='Revenue' value={formatCurrency(p.total_revenue)} />
        <Mini label='Cost' value={formatCurrency(p.total_cost)} />
        <Mini label='Gross Profit' value={formatCurrency(p.gross_profit)} />
        <Mini label='Margin' value={`${p.profit_percent.toFixed(1)}%`} />
      </div>
      <div className={s.panelGrid}>
        {itemList('Revenue Items', campaign.revenue_items ?? [])}
        {itemList('Cost Items', campaign.cost_items ?? [])}
      </div>
      <p className='muted' style={{ marginTop: 16, fontSize: '0.78rem' }}>
        {titleCase(campaign.unit)}
      </p>
    </Modal>
  );
}

function WorkplanModal({
  workplan,
  onClose,
}: {
  workplan: ConfiguredWorkplan;
  onClose: () => void;
}) {
  return (
    <Modal
      title={workplan.template_name}
      onClose={onClose}
      footer={
        <button className='btn btn-secondary' onClick={onClose}>
          Close
        </button>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span className='muted' style={{ fontSize: '0.8rem' }}>
          {getOpsTeam(workplan.template_name)}
        </span>
        <StatusBadge kind='ops' value={workplan.status} />
      </div>
      <div className='table-wrap'>
        <table className='table'>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Start</th>
              <th>End</th>
              {workplan.activities.some((a) => a.ops_start_date) && <th>Ops Start</th>}
              {workplan.activities.some((a) => a.ops_end_date) && <th>Ops End</th>}
            </tr>
          </thead>
          <tbody>
            {workplan.activities.map((a, i) => (
              <tr key={`${a.name}-${i}`}>
                <td>{a.name}</td>
                <td className='mono' style={{ fontSize: '0.78rem', color: 'var(--c-text-muted)' }}>
                  {a.start_date || '—'}
                </td>
                <td className='mono' style={{ fontSize: '0.78rem', color: 'var(--c-text-muted)' }}>
                  {a.end_date || '—'}
                </td>
                {workplan.activities.some((x) => x.ops_start_date) && (
                  <td className='mono' style={{ fontSize: '0.78rem' }}>
                    {a.ops_start_date || '—'}
                  </td>
                )}
                {workplan.activities.some((x) => x.ops_end_date) && (
                  <td className='mono' style={{ fontSize: '0.78rem' }}>
                    {a.ops_end_date || '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        border: '1px solid var(--c-border)',
        borderRadius: 8,
        background: 'var(--c-canvas)',
      }}
    >
      <div className='eyebrow'>{label}</div>
      <div className='mono' style={{ fontWeight: 700, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}
