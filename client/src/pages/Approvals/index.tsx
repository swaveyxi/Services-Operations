import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  listPendingApprovals,
  approveCampaign,
  rejectCampaign,
} from '@/services';
import { getClientById } from '@/services/clients';
import { useServiceCall } from '@/hooks/useServiceCall';
import { MD_ROLE, AUTO_APPROVE_THRESHOLD } from '@shared/constants';
import { computeProfitability } from '@/utils/profitability';
import { formatCurrency } from '@/utils/format';
import type { Campaign, LineItem } from '@shared/types';
import s from './Approvals.module.css';

type PanelMode = 'approve' | 'reject' | null;

export default function Approvals() {
  const { hasRole } = useAuth();
  const [busy, call] = useServiceCall();
  const isMd = hasRole(MD_ROLE);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isMd) { setLoading(false); return; }
    listPendingApprovals().then(async (list) => {
      setCampaigns(list);
      setLoading(false);
      const ids = [...new Set(list.map((c) => c.client_id).filter(Boolean) as string[])];
      const pairs = await Promise.all(ids.map(async (id) => {
        const cl = await getClientById(id);
        return [id, cl?.display_name ?? ''] as const;
      }));
      setClientNames(Object.fromEntries(pairs.filter(([, n]) => n)));
    });
  }, [isMd]);

  function openPanel(id: string, mode: PanelMode) {
    setPanelId(id);
    setPanelMode(mode);
    setNote('');
  }

  function closePanel() {
    setPanelId(null);
    setPanelMode(null);
    setNote('');
  }

  async function handleApprove(id: string) {
    const result = await call(() => approveCampaign(id, note));
    if (result) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      closePanel();
    }
  }

  async function handleReject(id: string) {
    const result = await call(() => rejectCampaign(id, note));
    if (result) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      closePanel();
    }
  }

  if (!isMd) {
    return (
      <>
        <div className='page-head'>
          <div><h1 className='page-title'>Approvals</h1></div>
        </div>
        <div className='empty-state'>You do not have access to this section.</div>
      </>
    );
  }

  if (loading) return <div className='loading-state'>Loading approvals…</div>;

  return (
    <>
      <div className='page-head'>
        <div>
          <h1 className='page-title'>Profitability Approvals</h1>
          <p className='page-sub'>
            Campaigns routed for MD sign-off — below the {AUTO_APPROVE_THRESHOLD}% auto-approve threshold.
          </p>
        </div>
        <span className={s.threshold}>
          <i className='fa-solid fa-bolt' aria-hidden='true' />
          Auto-approve at <strong>≥{AUTO_APPROVE_THRESHOLD}%</strong>
        </span>
      </div>

      {campaigns.length === 0 ? (
        <div className='empty-state'>
          <i className='fa-solid fa-circle-check' style={{ marginRight: 8 }} />
          No campaigns pending approval.
        </div>
      ) : (
        <div className={s.queue}>
          {campaigns.map((c) => {
            const p = computeProfitability(c.revenue_items ?? [], c.cost_items ?? []);
            const tier =
              p.profit_percent >= AUTO_APPROVE_THRESHOLD ? 'high'
              : p.profit_percent >= 40 ? 'mid'
              : 'low';
            const activeMode = panelId === c.id ? panelMode : null;
            const clientName = c.client_id ? clientNames[c.client_id] : null;

            return (
              <div
                key={c.id}
                className={`${s.card} ${activeMode === 'reject' ? s.cardRejecting : activeMode === 'approve' ? s.cardApproving : ''}`}
              >
                {/* ── Main row: stripe + content ── */}
                <div className={s.cardMain}>
                  <div className={s.stripe} data-tier={tier} />

                  <div className={s.body}>
                    {/* Header */}
                    <div className={s.header}>
                      <div className={s.identity}>
                        <span className={s.cid}>{c.campaign_id}</span>
                        {clientName && <span className={s.client}>{clientName}</span>}
                        <span className={s.meta}>{c.unit}</span>
                      </div>

                      <div className={s.profBox} data-tier={tier}>
                        <span className={s.profPct}>{p.profit_percent.toFixed(1)}%</span>
                        <span className={s.profLabel}>
                          {tier === 'high' ? 'Auto-approve eligible'
                            : tier === 'mid' ? 'Moderate margin'
                            : 'Below threshold'}
                        </span>
                      </div>

                      <div className={s.actions}>
                        {!activeMode ? (
                          <>
                            <button
                              className='btn btn-success btn-sm'
                              disabled={busy}
                              onClick={() => openPanel(c.id, 'approve')}
                            >
                              <i className='fa-solid fa-check' aria-hidden='true' /> Approve
                            </button>
                            <button
                              className='btn btn-secondary btn-sm'
                              disabled={busy}
                              onClick={() => openPanel(c.id, 'reject')}
                            >
                              <i className='fa-solid fa-xmark' aria-hidden='true' /> Reject
                            </button>
                          </>
                        ) : (
                          <button className='btn btn-ghost btn-sm' onClick={closePanel}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Line items */}
                    <div className={s.items}>
                      <LineTable label='Revenue Items' rows={c.revenue_items ?? []} kind='revenue' />
                      <LineTable label='Cost Items' rows={c.cost_items ?? []} kind='cost' />
                    </div>

                    {/* Totals bar */}
                    <div className={s.totals}>
                      <TotalCell label='Total Revenue' value={p.total_revenue} />
                      <TotalCell label='Total Cost' value={p.total_cost} />
                      <TotalCell label='Gross Profit' value={p.gross_profit} accent />
                    </div>
                  </div>
                </div>

                {/* ── Approve panel ── */}
                {activeMode === 'approve' && (
                  <div className={s.approvePanel}>
                    <div className={s.panelHeader}>
                      <i className='fa-solid fa-circle-check' aria-hidden='true' />
                      Approve {c.campaign_id}
                    </div>
                    <label className={s.noteLabel}>
                      Approval note <span className={s.noteOptional}>(optional)</span>
                    </label>
                    <textarea
                      className={`input ${s.noteArea}`}
                      placeholder='Add a note for the record, e.g. agreed scope, conditions…'
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className={s.panelActions}>
                      <button
                        className='btn btn-success btn-sm'
                        disabled={busy}
                        onClick={() => handleApprove(c.id)}
                      >
                        <i className='fa-solid fa-check' aria-hidden='true' /> Confirm Approval
                      </button>
                      <button className='btn btn-ghost btn-sm' onClick={closePanel}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Reject panel ── */}
                {activeMode === 'reject' && (
                  <div className={s.rejectPanel}>
                    <div className={s.panelHeader}>
                      <i className='fa-solid fa-ban' aria-hidden='true' />
                      Reject {c.campaign_id}
                    </div>
                    <label className={s.noteLabel}>
                      Rejection note <span className={s.noteOptional}>(optional)</span>
                    </label>
                    <textarea
                      className={`input ${s.noteArea}`}
                      placeholder='Explain what needs to change before resubmission…'
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className={s.panelActions}>
                      <button
                        className='btn btn-danger btn-sm'
                        disabled={busy}
                        onClick={() => handleReject(c.id)}
                      >
                        <i className='fa-solid fa-ban' aria-hidden='true' /> Confirm Rejection
                      </button>
                      <button className='btn btn-ghost btn-sm' onClick={closePanel}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function LineTable({ label, rows, kind }: { label: string; rows: LineItem[]; kind: 'revenue' | 'cost' }) {
  return (
    <div className={s.lineTable}>
      <div className={`${s.lineLabel} ${kind === 'revenue' ? s.lineLabelRev : s.lineLabelCost}`}>
        {label}
      </div>
      {rows.length === 0 ? (
        <p className={s.lineEmpty}>None</p>
      ) : (
        <table className={s.table}>
          <thead>
            <tr>
              <th>Service</th>
              <th className={s.num}>Qty</th>
              <th className={s.num}>Rate (₦)</th>
              <th className={s.num}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className={s.serviceName}>{r.service_name}</td>
                <td className={s.num}>{r.quantity ?? 0}</td>
                <td className={s.num}>{formatCurrency(r.rate ?? 0)}</td>
                <td className={`${s.num} ${s.lineTotal}`}>
                  {formatCurrency((r.rate ?? 0) * (r.quantity ?? 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TotalCell({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`${s.totalCell} ${accent ? s.totalAccent : ''}`}>
      <span className={s.totalLabel}>{label}</span>
      <span className={s.totalVal}>{formatCurrency(value)}</span>
    </div>
  );
}
