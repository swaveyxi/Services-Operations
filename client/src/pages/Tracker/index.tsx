import { useEffect, useMemo, useState } from 'react';
import { useServiceCall } from '@/hooks/useServiceCall';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getCampaign,
  listWorkplansForCampaign,
  listFormsForCampaign,
  updateCampaign,
  updateFormDetails,
  getServiceCatalog,
  archiveCampaign,
  unarchiveCampaign,
  deleteCampaign,
  type ServiceCatalog,
} from '@/services';
import { getClientById } from '@/services/clients';
import { useAuth } from '@/context/AuthContext';
import type { Campaign, ConfiguredWorkplan, SupportForm, LineItem, Service } from '@shared/types';
import { StatusBadge } from '@/components/StatusBadge';
import { LifecyclePipeline } from '@/components/LifecyclePipeline';
import { Modal } from '@/components/Modal';
import { FormDetailBody } from '@/components/FormDetailBody';
import { FORM_TITLE_TO_KEY, FORM_CATALOG_META, getOpsTeam } from '@shared/constants';
import { computeProfitability } from '@/utils/profitability';
import { incomeToLineItem } from '@/utils/services';
import { formatCurrency, formatDate, ciEq } from '@/utils/format';
import { toCampaignDisplayStatus } from '@/utils/status';
import s from './Tracker.module.css';

export default function Tracker() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [c, setC] = useState<Campaign | null>(null);
  const [workplans, setWorkplans] = useState<ConfiguredWorkplan[]>([]);
  const [forms, setForms] = useState<SupportForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<SupportForm | null>(null);
  const [editingSessions, setEditingSessions] = useState(false);
  const [sessionRows, setSessionRows] = useState<Record<string, string>[]>([]);
  const [savingSessions, callSessions] = useServiceCall();
  const [saving, callCommercials] = useServiceCall();
  const [editingCommercials, setEditingCommercials] = useState(false);
  const [snapshot, setSnapshot] = useState<Pick<Campaign, 'revenue_items' | 'cost_items'> | null>(
    null,
  );
  const [catalog, setCatalog] = useState<ServiceCatalog | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [archiving, callArchive] = useServiceCall();
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    getCampaign(id)
      .then((camp) => {
        if (!active) return;
        setC(camp);
        setLoading(false);
        if (camp) {
          listWorkplansForCampaign(camp.id).then(setWorkplans);
          listFormsForCampaign(camp.id).then(setForms);
          if (camp.client_id) {
            getClientById(camp.client_id).then((cl) => {
              if (active) setClientName(cl?.display_name ?? null);
            });
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Case not found.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const isOwner = !!(c && userId && c.owner_user_id === userId);
  const archived = !!c?.is_archived;
  const locked = c ? archived || !['Draft', 'Workplan'].includes(c.campaign_status ?? '') : false;
  const profit = useMemo(
    () => (c ? computeProfitability(c.revenue_items ?? [], c.cost_items ?? []) : null),
    [c],
  );

  function editLine(
    kind: 'revenue' | 'cost',
    idx: number,
    field: 'rate' | 'quantity',
    value: number,
  ) {
    if (!c) return;
    const key = kind === 'revenue' ? 'revenue_items' : 'cost_items';
    const items = (c[key] ?? []).map((it, i) => (i === idx ? { ...it, [field]: value } : it));
    setC({ ...c, [key]: items });
  }

  function addLine(kind: 'revenue' | 'cost', service: Service) {
    if (!c) return;
    const key = kind === 'revenue' ? 'revenue_items' : 'cost_items';
    const existing = c[key] ?? [];
    if (existing.some((it) => it.service_name === service.service)) return;
    setC({ ...c, [key]: [...existing, incomeToLineItem(service)] });
  }

  function removeLine(kind: 'revenue' | 'cost', idx: number) {
    if (!c) return;
    const key = kind === 'revenue' ? 'revenue_items' : 'cost_items';
    setC({ ...c, [key]: (c[key] ?? []).filter((_, i) => i !== idx) });
  }

  function openSessionsEdit(form: SupportForm) {
    const rows = (form.form_details?.testingSessions as Record<string, string>[] | undefined) || [];
    setSessionRows(rows.map((r) => ({ ...r })));
    setEditingSessions(true);
  }

  function closeFormModal() {
    setActiveForm(null);
    setEditingSessions(false);
    setSessionRows([]);
  }

  async function saveSessions() {
    if (!activeForm) return;
    const updated = await callSessions(() =>
      updateFormDetails(activeForm.id, {
        ...activeForm.form_details,
        testingSessions: sessionRows,
      }),
    );
    if (updated) {
      setForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setActiveForm(updated);
      setEditingSessions(false);
    }
  }

  function startEditCommercials() {
    if (!c) return;
    setSnapshot({ revenue_items: c.revenue_items, cost_items: c.cost_items });
    setEditingCommercials(true);
    if (!catalog) getServiceCatalog(c.unit).then(setCatalog);
  }

  function cancelEditCommercials() {
    if (snapshot && c) setC({ ...c, ...snapshot });
    setSnapshot(null);
    setEditingCommercials(false);
  }

  async function saveCommercials() {
    if (!c) return;
    const updated = await callCommercials(() =>
      updateCampaign(c.id, { revenue_items: c.revenue_items, cost_items: c.cost_items }),
    );
    if (updated) {
      setC(updated);
      setSnapshot(null);
      setEditingCommercials(false);
    }
  }

  async function handleArchive() {
    if (!c) return;
    const result = await callArchive(() => archiveCampaign(c.id));
    if (result !== null) {
      setShowArchiveConfirm(false);
      getCampaign(c.id).then(setC);
    }
  }

  async function handleUnarchive() {
    if (!c) return;
    const result = await callArchive(() => unarchiveCampaign(c.id));
    if (result !== null) getCampaign(c.id).then(setC);
  }

  async function handleDelete() {
    if (!c) return;
    const result = await callArchive(() => deleteCampaign(c.id));
    if (result !== null) navigate('/');
  }

  if (loading) return <div className='loading-state'>Loading case…</div>;
  if (!c)
    return (
      <div className='error-state'>
        {loadError || 'Case not found.'}{' '}
        <button className='btn btn-secondary' onClick={() => navigate('/')}>
          Back to Cases
        </button>
      </div>
    );

  return (
    <>
      <div className={s.head}>
        <div className={s.idRow}>
          <span className={s.cid}>{c.campaign_id}</span>
          <StatusBadge kind='campaign' value={toCampaignDisplayStatus(c.campaign_status)} />
        </div>
        <div className={s.headActions}>
          {isOwner && !archived && (
            <button
              className='btn btn-secondary'
              onClick={() => setShowArchiveConfirm(true)}
              disabled={archiving}
            >
              <i className='fa-solid fa-box-archive' aria-hidden='true' /> Archive
            </button>
          )}
          {isOwner && (
            <button
              className='btn btn-danger'
              onClick={() => setShowDeleteConfirm(true)}
              disabled={archiving}
            >
              <i className='fa-solid fa-trash' aria-hidden='true' /> Delete
            </button>
          )}
          <button className='btn btn-secondary' onClick={() => navigate('/')}>
            <i className='fa-solid fa-arrow-left' aria-hidden='true' /> Back to Cases
          </button>
        </div>
      </div>

      {archived && (
        <div className={s.archivedBanner}>
          <span>
            <i className='fa-solid fa-box-archive' aria-hidden='true' /> This case is archived and
            read-only.
          </span>
          {isOwner && (
            <button className='btn btn-secondary btn-sm' onClick={handleUnarchive} disabled={archiving}>
              {archiving ? 'Restoring…' : 'Unarchive'}
            </button>
          )}
        </div>
      )}

      {showArchiveConfirm && (
        <Modal
          title='Archive this case?'
          onClose={() => setShowArchiveConfirm(false)}
          footer={
            <>
              <button
                className='btn btn-secondary'
                onClick={() => setShowArchiveConfirm(false)}
                disabled={archiving}
              >
                Cancel
              </button>
              <button className='btn btn-primary' onClick={handleArchive} disabled={archiving}>
                {archiving ? 'Archiving…' : 'Archive Case'}
              </button>
            </>
          }
        >
          <p>
            <strong>{c.campaign_id}</strong> will be hidden from your active cases and marked
            read-only. You can restore it anytime from the Archived Cases list on My Cases.
          </p>
        </Modal>
      )}

      {showDeleteConfirm && (
        <Modal
          title='Delete this case?'
          onClose={() => {
            setShowDeleteConfirm(false);
            setDeleteConfirmText('');
          }}
          footer={
            <>
              <button
                className='btn btn-secondary'
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                disabled={archiving}
              >
                Cancel
              </button>
              <button
                className='btn btn-danger'
                onClick={handleDelete}
                disabled={archiving || deleteConfirmText.trim() !== c.campaign_id}
              >
                {archiving ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </>
          }
        >
          <p>
            This <strong>cannot be undone</strong>. {c.campaign_id} and everything attached to it
            (workplans, forms, commercials) will be permanently and irreversibly locked — never
            visible or editable again.
          </p>
          <p>
            Type <strong>{c.campaign_id}</strong> to confirm.
          </p>
          <input
            className='input'
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={c.campaign_id}
            autoFocus
          />
        </Modal>
      )}

      <div className={s.grid}>
        <div
          className='card card-pad'
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          <LifecyclePipeline
            approval_status={c.approval_status ?? ''}
            campaign_status={c.campaign_status}
          />
          <Link to={`/atlas/${c.id}`} className='btn btn-secondary'>
            <i className='fa-solid fa-diagram-project' aria-hidden='true' /> Access Campaign
            Dashboard
          </Link>
        </div>

        <div className='card card-pad'>
          <div className='section-head'>
            <h2 className='section-title'>Case Summary</h2>
          </div>
          <div className={s.summaryGrid}>
            <div className={s.summaryCol}>
              <div className={s.summaryItem}>
                <span className='eyebrow'>Business Unit</span>
                <span className={s.summaryVal}>{c.unit || '—'}</span>
              </div>
              <div className={s.summaryItem}>
                <span className='eyebrow'>Campaign Name</span>
                <span className={s.summaryVal}>{c.name || '—'}</span>
              </div>
            </div>
            <div className={s.summaryCol}>
              <div className={s.summaryItem}>
                <span className='eyebrow'>Client</span>
                <span className={s.summaryVal}>{clientName || '—'}</span>
              </div>
              <div className={s.summaryItem}>
                <span className='eyebrow'>Case Owner</span>
                <span className={s.summaryVal}>{c.owner_name || '—'}</span>
              </div>
            </div>
          </div>
          <div className={`${s.summaryItem} ${s.full}`}>
            <span className='eyebrow'>Description</span>
            <span className={s.summaryVal}>{c.description || '—'}</span>
          </div>
        </div>

        <div className='card card-pad'>
          <div className='section-head'>
            <h2 className='section-title'>Commercials</h2>
            {locked ? (
              <span className={s.lockNote}>
                <i className='fa-solid fa-lock' aria-hidden='true' />{' '}
                {archived ? 'Case is archived' : 'Profitability Approval - Triggered'}
              </span>
            ) : editingCommercials ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className='btn btn-secondary btn-sm'
                  onClick={cancelEditCommercials}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className='btn btn-primary btn-sm'
                  onClick={saveCommercials}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            ) : (
              <button className='btn btn-secondary btn-sm' onClick={startEditCommercials}>
                <i className='fa-solid fa-pen' aria-hidden='true' /> Edit
              </button>
            )}
          </div>

          <CommercialTable
            title='Revenue Items'
            items={c.revenue_items ?? []}
            locked={locked || !editingCommercials}
            catalog={editingCommercials ? (catalog?.income ?? []) : []}
            onEdit={(i, f, v) => editLine('revenue', i, f, v)}
            onAdd={(svc) => addLine('revenue', svc)}
            onRemove={(i) => removeLine('revenue', i)}
          />
          <div style={{ height: 16 }} />
          <CommercialTable
            title='Cost Items'
            items={c.cost_items ?? []}
            locked={locked || !editingCommercials}
            catalog={editingCommercials ? (catalog?.cost ?? []) : []}
            onEdit={(i, f, v) => editLine('cost', i, f, v)}
            onAdd={(svc) => addLine('cost', svc)}
            onRemove={(i) => removeLine('cost', i)}
          />

          {profit && (
            <div className={s.profitGrid} style={{ marginTop: 20 }}>
              <div className={s.stat}>
                <span className='eyebrow'>Total Revenue</span>
                <div className={s.statVal}>{formatCurrency(profit.total_revenue)}</div>
              </div>
              <div className={s.stat}>
                <span className='eyebrow'>Total Cost</span>
                <div className={s.statVal}>{formatCurrency(profit.total_cost)}</div>
              </div>
              <div className={s.stat}>
                <span className='eyebrow'>Gross Profit</span>
                <div className={s.statVal}>{formatCurrency(profit.gross_profit)}</div>
              </div>
              <div className={`${s.stat} ${s.accent}`}>
                <span className='eyebrow'>Profitability</span>
                <div
                  className={`${s.statVal} ${
                    profit.profit_percent < 0 ? s.neg : profit.profit_percent > 30 ? s.pos : ''
                  }`}
                >
                  {profit.profit_percent.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>

        <div className='card card-pad'>
          <div className='section-head'>
            <h2 className='section-title'>Workplan</h2>
            {!archived && (
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  className='btn btn-primary btn-sm'
                  onClick={() => navigate(`/workplan/${c.id}`)}
                >
                  Configure Workplan
                </button>
              </div>
            )}
          </div>
          {workplans.length === 0 ? (
            <p className='muted'>No workplan configured yet.</p>
          ) : (
            <div>
              {workplans.map((w) => (
                <div
                  key={w.id}
                  className={`${s.routeItem} ${s.routeItemLink}`}
                  onClick={() =>
                    navigate(
                      !archived && ['Not Started', 'Draft'].includes(w.status)
                        ? `/workplan/${c.id}`
                        : `/workplan-view/${c.id}`,
                    )
                  }
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{w.template_name}</div>
                    <div className={s.routeMeta}>
                      {w.activities.length} activities · {getOpsTeam(w.template_name)}
                    </div>
                  </div>
                  <StatusBadge kind='ops' value={w.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='card card-pad'>
          <div className='section-head'>
            <h2 className='section-title'>
              Briefing Forms{' '}
              <span className='section-count' style={{ color: 'var(--c-text-faint)' }}>
                ({forms.length})
              </span>
            </h2>
            {!archived && (
              <button className='btn btn-secondary btn-sm' onClick={() => navigate(`/forms/${c.id}`)}>
                <i className='fa-solid fa-plus' aria-hidden='true' /> Submit a Form
              </button>
            )}
          </div>
          {forms.length === 0 ? (
            <p className='muted'>No forms submitted for this case yet.</p>
          ) : (
            <div className='stack-sm'>
              {forms.map((f) => {
                const title =
                  FORM_CATALOG_META[FORM_TITLE_TO_KEY[f.form_type]]?.title || f.form_type;
                const activeHandoffs = f.handoffs.filter((h) => h.status !== 'Completed');
                const handoffLabel =
                  f.handoffs.length === 0
                    ? null
                    : activeHandoffs.length === 0
                      ? 'Job Complete'
                      : `Sent to ${activeHandoffs.map((h) => h.team).join(', ')}`;
                return (
                  <div key={f.id} className={s.formRow} onClick={() => setActiveForm(f)}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</div>
                      <div className={s.formMeta}>
                        {f.submitter_name ?? '—'} · {formatDate(f.submitted_on)} ·{' '}
                        {f.operations_team}
                      </div>
                    </div>
                    <div className={s.formRight}>
                      <span className={s.badgeGroup}>
                        <span className={s.badgeLabel}>Delivery Status:</span>
                        <StatusBadge
                          kind='delivery'
                          value={f.delivery_status}
                          submittedOn={f.submitted_on}
                        />
                      </span>
                      {handoffLabel && (
                        <span className={s.badgeGroup}>
                          <span className={s.badgeLabel}>Handoff Status:</span>
                          <StatusBadge kind='handoff' value={handoffLabel} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {locked && (
          <div className='card card-pad'>
            <div className='section-head'>
              <div className='row-between' style={{ gap: 12 }}>
                <h2 className='section-title'>Approval</h2>
                <StatusBadge kind='approval' value={c.approval_status ?? 'Not Started'} />
              </div>
            </div>

            <div className={s.summaryGrid}>
              <div className={s.summaryItem}>
                <span className='eyebrow'>Profitability</span>
                <div
                  className={`${s.statVal} ${
                    profit
                      ? profit.profit_percent >= 60
                        ? s.pos
                        : profit.profit_percent < 0
                          ? s.neg
                          : ''
                      : ''
                  }`}
                  style={{ fontSize: '1.15rem', marginTop: 4 }}
                >
                  {profit ? `${profit.profit_percent.toFixed(1)}%` : '—'}
                </div>
              </div>
              <div className={s.summaryItem}>
                <span className='eyebrow'>Approval Route</span>
                <div className={s.approvalRoute}>
                  {profit && profit.profit_percent >= 60 ? (
                    <>
                      <i
                        className='fa-solid fa-circle-check'
                        aria-hidden='true'
                        style={{ color: 'var(--t-positive-fg)' }}
                      />
                      Auto-approval
                    </>
                  ) : (
                    <>
                      <i
                        className='fa-solid fa-user-tie'
                        aria-hidden='true'
                        style={{ color: 'var(--t-info-fg)' }}
                      />
                      MD approval
                    </>
                  )}
                </div>
              </div>
            </div>

            {ciEq(c.approval_status ?? '', 'Pending') && (
              <div className={s.approvalNote}>
                <i className='fa-solid fa-clock' aria-hidden='true' /> Pending — MD has been
                notified.
              </div>
            )}
            {ciEq(c.approval_status ?? '', 'Approved') && (
              <div
                className={s.approvalNote}
                style={{
                  borderColor: 'var(--t-positive-bd)',
                  color: 'var(--t-positive-fg)',
                  background: 'var(--t-positive-bg)',
                }}
              >
                <i className='fa-solid fa-circle-check' aria-hidden='true' /> Approved — this case
                is now active.
              </div>
            )}
            {ciEq(c.approval_status ?? '', 'Rejected') && (
              <div
                className={s.approvalNote}
                style={{
                  borderColor: 'var(--t-negative-bd)',
                  color: 'var(--t-negative-fg)',
                  background: 'var(--t-negative-bg)',
                }}
              >
                <i className='fa-solid fa-circle-xmark' aria-hidden='true' /> Rejected — this case
                is now closed.
              </div>
            )}
          </div>
        )}
      </div>

      {activeForm && (
        <Modal
          title={
            FORM_CATALOG_META[FORM_TITLE_TO_KEY[activeForm.form_type]]?.title ||
            activeForm.form_type
          }
          onClose={closeFormModal}
          footer={
            editingSessions ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className='btn btn-secondary'
                  onClick={() => setEditingSessions(false)}
                  disabled={savingSessions}
                >
                  Cancel
                </button>
                <button
                  className='btn btn-primary'
                  onClick={saveSessions}
                  disabled={savingSessions}
                >
                  {savingSessions ? 'Saving…' : 'Save Sessions'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className='btn btn-secondary' onClick={closeFormModal}>
                  Close
                </button>
                {!archived &&
                  FORM_TITLE_TO_KEY[activeForm.form_type] === 'test-order' &&
                  activeForm.delivery_status !== 'Acknowledged' &&
                  activeForm.delivery_status !== 'Completed' && (
                    <button
                      className='btn btn-primary btn-sm'
                      onClick={() => openSessionsEdit(activeForm)}
                    >
                      <i className='fa-solid fa-pen' aria-hidden='true' /> Edit Sessions
                    </button>
                  )}
              </div>
            )
          }
        >
          {editingSessions ? (
            <SessionsEditor rows={sessionRows} onChange={setSessionRows} />
          ) : (
            <FormDetailBody form={activeForm} campaignLabel={c?.campaign_id} />
          )}
        </Modal>
      )}
    </>
  );
}

const SESSION_COLS = [
  { id: 'startDate', label: 'Start Date', type: 'date' },
  { id: 'endDate', label: 'End Date', type: 'date' },
  { id: 'startTime', label: 'Start Time', type: 'time' },
  { id: 'endTime', label: 'End Time', type: 'time' },
] as const;

function SessionsEditor({
  rows,
  onChange,
}: {
  rows: Record<string, string>[];
  onChange: (next: Record<string, string>[]) => void;
}) {
  function setCell(ri: number, col: string, val: string) {
    onChange(rows.map((r, i) => (i === ri ? { ...r, [col]: val } : r)));
  }
  return (
    <div>
      <div className='table-wrap'>
        <table className='table'>
          <thead>
            <tr>
              {SESSION_COLS.map((c) => (
                <th key={c.id}>{c.label}</th>
              ))}
              <th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {SESSION_COLS.map((c) => (
                  <td key={c.id}>
                    <input
                      className={s.priceInput}
                      style={{ width: c.type === 'time' ? 100 : 130 }}
                      type={c.type}
                      value={row[c.id] || ''}
                      onChange={(e) => setCell(ri, c.id, e.target.value)}
                    />
                  </td>
                ))}
                <td>
                  <button
                    className='btn btn-ghost btn-sm'
                    onClick={() => onChange(rows.filter((_, i) => i !== ri))}
                    aria-label='Remove row'
                  >
                    <i className='fa-solid fa-xmark' aria-hidden='true' />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className='btn btn-secondary btn-sm'
        style={{ marginTop: 8 }}
        onClick={() => onChange([...rows, {}])}
      >
        <i className='fa-solid fa-plus' aria-hidden='true' /> Add Session
      </button>
    </div>
  );
}

function CommercialTable({
  title,
  items,
  locked,
  catalog,
  onEdit,
  onAdd,
  onRemove,
}: {
  title: string;
  items: LineItem[];
  locked: boolean;
  catalog: Service[];
  onEdit: (idx: number, field: 'rate' | 'quantity', value: number) => void;
  onAdd: (svc: Service) => void;
  onRemove: (idx: number) => void;
}) {
  const available = catalog.filter((s) => !items.some((it) => it.service_name === s.service));
  return (
    <div>
      <div className='eyebrow' style={{ marginBottom: 8 }}>
        {title}
      </div>
      {items.length === 0 ? (
        <p className='muted'>No {title.toLowerCase()}.</p>
      ) : (
        <div className='table-wrap'>
          <table className='table'>
            <thead>
              <tr>
                <th>Service</th>
                <th>Price (₦)</th>
                <th>Qty</th>
                <th style={{ textAlign: 'right' }}>Line Total</th>
                {!locked && <th />}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={`${it.acct_num}-${it.service_name}-${i}`}>
                  <td>{it.service_name}</td>
                  <td>
                    <input
                      className={s.priceInput}
                      type='number'
                      min={0}
                      step='0.01'
                      value={it.rate || ''}
                      disabled={locked}
                      onChange={(e) => onEdit(i, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <input
                      className={s.priceInput}
                      type='number'
                      min={0}
                      value={it.quantity || ''}
                      disabled={locked}
                      onChange={(e) => onEdit(i, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className={s.lineTotal} style={{ textAlign: 'right' }}>
                    {formatCurrency((it.rate || 0) * (it.quantity || 0))}
                  </td>
                  {!locked && (
                    <td>
                      <button
                        className='btn btn-ghost btn-sm'
                        onClick={() => onRemove(i)}
                        aria-label={`Remove ${it.service_name}`}
                      >
                        <i className='fa-solid fa-xmark' aria-hidden='true' />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!locked && available.length > 0 && (
        <select
          className='select'
          style={{ marginTop: 8 }}
          value=''
          onChange={(e) => {
            const svc = catalog.find((s) => s.service === e.target.value);
            if (svc) {
              onAdd(svc);
              e.target.value = '';
            }
          }}
        >
          <option value=''>Add a {title.toLowerCase().replace(' items', '')} item…</option>
          {available.map((s) => (
            <option key={s.acct_num || s.service} value={s.service}>
              {s.service}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
