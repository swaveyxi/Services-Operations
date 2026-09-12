import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useServiceCall } from '@/hooks/useServiceCall';
import {
  listClients,
  getServiceCatalog,
  createCampaign,
  createClient,
  setClientAbbreviation,
  type ServiceCatalog,
  type AtlasStageDraft,
} from '@/services';
import type { ClientContact, LineItem, Service } from '@shared/types';
import { BUSINESS_UNITS, ATLAS_PLATFORMS } from '@shared/constants';
import { matchAssociatedCosts, incomeToLineItem } from '@/utils/services';
import s from './Builder.module.css';

const dedupeKey = (i: LineItem) => i.acct_num || i.service_name;

const STEPS = [
  { num: 1, label: 'Case Details' },
  { num: 2, label: 'Application Stages' },
] as const;

export default function Builder() {
  const { userName, userEmail } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);

  const [clients, setClients] = useState<ClientContact[]>([]);
  const [unit, setUnit] = useState('');
  const [catalog, setCatalog] = useState<ServiceCatalog | null>(null);

  const [campaignName, setCampaignName] = useState('');
  const [clientName, setClientName] = useState('');
  const [contactId, setContactId] = useState('');
  const [isExisting, setIsExisting] = useState(false);
  const [abbreviation, setAbbreviation] = useState('');
  const [storedAbbr, setStoredAbbr] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);

  const [description, setDescription] = useState('');
  const [revenueItems, setRevenueItems] = useState<LineItem[]>([]);
  const [manualCosts, setManualCosts] = useState<LineItem[]>([]);
  const [dismissedAutoKeys, setDismissedAutoKeys] = useState<Set<string>>(new Set());
  const [atlasStages, setAtlasStages] = useState<AtlasStageDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, call] = useServiceCall();

  function addStage(platform_slug: string) {
    if (!platform_slug || atlasStages.some((s) => s.platform_slug === platform_slug)) return;
    setAtlasStages((prev) => [
      ...prev,
      { platform_slug, stage_order: prev.length + 1, progression_mode: 'Manual' },
    ]);
  }
  function removeStage(index: number) {
    setAtlasStages((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stage_order: i + 1 })),
    );
  }
  function updateStage(index: number, patch: Partial<AtlasStageDraft>) {
    setAtlasStages((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const n = clientName.trim();
    if (!n) {
      setClients([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      listClients(n).then(setClients);
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [clientName]);

  useEffect(() => {
    if (!unit) {
      setCatalog(null);
      return;
    }
    setRevenueItems([]);
    setManualCosts([]);
    getServiceCatalog(unit).then(setCatalog);
  }, [unit]);

  const suggestions = clients.slice(0, 8);

  /* Costs auto-derived from selected revenue, merged with manual additions. */
  const autoCosts = useMemo(() => {
    if (!catalog) return [];
    const acc: LineItem[] = [];
    for (const r of revenueItems) {
      const income = catalog.income.find((i) => i.service === r.service_name);
      if (income) acc.push(...matchAssociatedCosts(income, catalog.cost));
    }
    return acc;
  }, [revenueItems, catalog]);

  const activeAutoCosts = useMemo(
    () => autoCosts.filter((c) => !dismissedAutoKeys.has(dedupeKey(c))),
    [autoCosts, dismissedAutoKeys],
  );
  const autoKeys = useMemo(() => new Set(activeAutoCosts.map(dedupeKey)), [activeAutoCosts]);
  const costItems = useMemo(() => {
    const byKey = new Map<string, LineItem>();
    for (const c of activeAutoCosts) byKey.set(dedupeKey(c), c);
    for (const c of manualCosts) if (!byKey.has(dedupeKey(c))) byKey.set(dedupeKey(c), c);
    return [...byKey.values()];
  }, [activeAutoCosts, manualCosts]);

  function selectClient(c: ClientContact) {
    setClientName(c.display_name);
    setContactId(c.id);
    setIsExisting(true);
    setAbbreviation(c.abbreviation || '');
    setStoredAbbr(c.abbreviation || '');
    setShowSuggest(false);
  }

  function onClientInput(v: string) {
    setClientName(v);
    setContactId('');
    setIsExisting(false);
    setShowSuggest(true);
    const exact = clients.find((c) => c.display_name.toLowerCase() === v.toLowerCase());
    if (exact) selectClient(exact);
  }

  function addRevenue(service: string) {
    if (!service || !catalog) return;
    const inc = catalog.income.find((i) => i.service === service);
    if (!inc || revenueItems.some((r) => r.service_name === service)) return;
    setRevenueItems((prev) => [...prev, incomeToLineItem(inc)]);
    setDismissedAutoKeys(new Set());
  }
  function addManualCost(service: string) {
    if (!service || !catalog) return;
    const c = catalog.cost.find((i) => i.service === service);
    if (!c) return;
    const li = incomeToLineItem(c);
    if (costItems.some((x) => dedupeKey(x) === dedupeKey(li))) return;
    setManualCosts((prev) => [...prev, li]);
  }

  const incomeOptions = catalog
    ? catalog.income.filter((i) => !revenueItems.some((r) => r.service_name === i.service))
    : [];
  const costOptions = catalog
    ? catalog.cost.filter((c) => !costItems.some((x) => x.service_name === c.service))
    : [];

  function validateStep1(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!unit) e.unit = 'Select a business unit';
    if (!clientName.trim()) e.client = 'Client is required';
    if (!campaignName.trim()) e.name = 'Campaign name is required';
    if (!abbreviation.trim()) e.abbreviation = 'Abbreviation is required';
    if (revenueItems.length === 0) e.revenue = 'Add at least one revenue item';
    return e;
  }

  function validateStep2(): Record<string, string> {
    const e: Record<string, string> = {};
    if (
      atlasStages.some((st) => st.progression_mode === 'Automatic' && st.threshold === undefined)
    ) {
      e.atlasStages = 'Automatic stages need a threshold';
    }
    return e;
  }

  function goNext() {
    const e = validateStep1();
    setErrors((prev) => {
      const { unit: _u, client: _c, name: _n, abbreviation: _a, revenue: _r, ...rest } = prev;
      return { ...rest, ...e };
    });
    if (Object.keys(e).length === 0) setStep(2);
  }

  async function submit() {
    const e = { ...validateStep1(), ...validateStep2() };
    setErrors(e);
    if (Object.keys(e).length > 0) {
      if (e.unit || e.client || e.name || e.abbreviation || e.revenue) setStep(1);
      return;
    }
    let clientIdForCase = contactId;
    if (!isExisting) {
      const created = await call(() => createClient(clientName, abbreviation));
      if (!created) return;
      clientIdForCase = created.id;
    } else if (abbreviation.trim() && abbreviation.trim() !== storedAbbr.trim()) {
      await call(() => setClientAbbreviation(contactId, abbreviation));
    }
    const campaign = await call(() =>
      createCampaign({
        unit,
        name: campaignName.trim(),
        client_id: clientIdForCase || null,
        description: description.trim() || null,
        revenue_items: revenueItems,
        cost_items: costItems,
        atlas_stages: atlasStages,
      }),
    );
    if (!campaign) return;
    if (campaign.atlas_registration_warning)
      showToast(campaign.atlas_registration_warning, 'warning');
    navigate(`/tracker/${campaign.id}`);
  }

  return (
    <div className={s.wrap}>
      <div className='page-head'>
        <div>
          <h1 className='page-title'>Create Case</h1>
          <p className='page-sub'>
            Define the client, services, and scope for a new business case.
          </p>
        </div>
      </div>

      <div className={s.stepper}>
        <div className='pipeline'>
          {STEPS.map((st, i) => (
            <div key={st.num} style={{ display: 'contents' }}>
              {i > 0 && <span className='pipeline-link' />}
              <div
                className={`pipeline-step ${step > st.num ? 'is-done' : ''} ${step === st.num ? 'is-current' : ''} ${step > st.num ? s.stepClickable : ''}`}
                onClick={() => step > st.num && setStep(st.num)}
              >
                <span className='pipeline-dot'>
                  {step > st.num ? <i className='fa-solid fa-check' aria-hidden='true' /> : st.num}
                </span>
                {st.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='card card-pad'>
        {step === 1 && (
          <>
            <div className={s.stepIntro}>
              <h2 className={s.stepTitle}>Case Details</h2>
              <p className={s.stepDesc}>Who this case is for, what's being billed, and why.</p>
            </div>

            <div className='eyebrow' style={{ marginBottom: 'var(--space-3)' }}>
              Unit & Client
            </div>
            <div className='field'>
              <label className='field-label'>
                Business Unit<span className='field-req'>*</span>
              </label>
              <select className='select' value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value=''>Select a unit…</option>
                {BUSINESS_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <span className='field-error'>{errors.unit}</span>
            </div>

            <div className='field'>
              <label className='field-label'>
                Client<span className='field-req'>*</span>
              </label>
              <div className={s.clientBox}>
                <input
                  className='input'
                  placeholder='Search or type a client name…'
                  value={clientName}
                  autoComplete='off'
                  onChange={(e) => onClientInput(e.target.value)}
                  onFocus={() => setShowSuggest(true)}
                  onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                />
                {showSuggest && suggestions.length > 0 && (
                  <div className={s.suggestions}>
                    {suggestions.map((c) => (
                      <div
                        key={c.id}
                        className={s.suggestion}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectClient(c)}
                      >
                        {c.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {clientName.trim() && !isExisting && (
                <div className={s.newClientNote}>
                  <i className='fa-solid fa-circle-plus' aria-hidden='true' /> New client -- a
                  contact record will be created on submit.
                </div>
              )}
              <span className='field-error'>{errors.client}</span>
            </div>

            <div className='field'>
              <label className='field-label'>
                Client Abbreviation<span className='field-req'>*</span>
              </label>
              <input
                className='input mono'
                placeholder='e.g. 7UP'
                maxLength={40}
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value.toUpperCase().replace(/\s+/g, ''))}
              />
              <span className='field-hint'>
                Used to generate the campaign ID, e.g.{' '}
                <span className={s.idPreview}>7UP/MONTH/YEAR</span>
                {storedAbbr ? "  -- editing changes this client's saved abbreviation." : ''}
              </span>
              <span className='field-error'>{errors.abbreviation}</span>
            </div>

            <div className='field'>
              <label className='field-label'>
                Campaign Name<span className='field-req'>*</span>
              </label>
              <input
                className='input'
                placeholder='e.g. MTN Scholarships 2026'
                maxLength={255}
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
              <span className='field-error'>{errors.name}</span>
            </div>

            <div className={s.sectionDivider}>
              <div className='eyebrow' style={{ marginBottom: 'var(--space-3)' }}>
                Services & Commercials
              </div>

              <div className='field'>
                <label className='field-label'>
                  Revenue Items<span className='field-req'>*</span>
                </label>
                <div className={s.tags}>
                  {revenueItems.length === 0 && <span className={s.emptyTags}>None selected</span>}
                  {revenueItems.map((r) => (
                    <span key={dedupeKey(r)} className={s.tag}>
                      {r.service_name}
                      <button
                        className={s.tagRemove}
                        onClick={() =>
                          setRevenueItems((p) => p.filter((x) => x.service_name !== r.service_name))
                        }
                        aria-label={`Remove ${r.service_name}`}
                      >
                        <i className='fa-solid fa-xmark' aria-hidden='true' />
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  className='select'
                  value=''
                  onChange={(e) => {
                    addRevenue(e.target.value);
                    e.target.value = '';
                  }}
                  style={{ marginTop: 8 }}
                >
                  <option value=''>Add a revenue item…</option>
                  {incomeOptions.map((i: Service) => (
                    <option key={i.acct_num || i.service} value={i.service}>
                      {i.service}
                    </option>
                  ))}
                </select>
                <span className='field-error'>{errors.revenue}</span>
              </div>

              <div className='field'>
                <label className='field-label'>Cost Items</label>
                <div className={s.tags}>
                  {costItems.length === 0 && (
                    <span className={s.emptyTags}>None -- add revenue to auto-match costs</span>
                  )}
                  {costItems.map((c) => {
                    const isAuto = autoKeys.has(dedupeKey(c));
                    return (
                      <span key={dedupeKey(c)} className={`${s.tag} ${isAuto ? s.auto : ''}`}>
                        {c.service_name}
                        <button
                          className={s.tagRemove}
                          onClick={() => {
                            if (isAuto) {
                              setDismissedAutoKeys((prev) => new Set([...prev, dedupeKey(c)]));
                            } else {
                              setManualCosts((p) => p.filter((x) => dedupeKey(x) !== dedupeKey(c)));
                            }
                          }}
                          aria-label={`Remove ${c.service_name}`}
                        >
                          <i className='fa-solid fa-xmark' aria-hidden='true' />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <select
                  className='select'
                  value=''
                  onChange={(e) => {
                    addManualCost(e.target.value);
                    e.target.value = '';
                  }}
                  style={{ marginTop: 8 }}
                >
                  <option value=''>Add a cost item…</option>
                  {costOptions.map((c: Service) => (
                    <option key={c.acct_num || c.service} value={c.service}>
                      {c.service}
                    </option>
                  ))}
                </select>
                <span className='field-hint'>Auto-matched from revenue selections.</span>
              </div>
            </div>

            <div className={s.sectionDivider}>
              <div className='eyebrow' style={{ marginBottom: 'var(--space-3)' }}>
                Case Justification
              </div>

              <div className='field'>
                <label className='field-label'>Description</label>
                <textarea
                  className='textarea'
                  rows={3}
                  placeholder='Brief overview of the scope or engagement…'
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className={s.stepIntro}>
              <h2 className={s.stepTitle}>Application Stages</h2>
              <p className={s.stepDesc}>Stages candidates go through for this campaign.</p>
            </div>

            <div className='field'>
              <div className={s.stageList}>
                {atlasStages.length === 0 && (
                  <span className={s.emptyTags}>
                    No stages configured -- Ordered in the sequence candidates move through.
                  </span>
                )}
                {atlasStages.map((stage, i) => {
                  const platform = ATLAS_PLATFORMS.find((p) => p.slug === stage.platform_slug);
                  return (
                    <div key={stage.platform_slug} className={s.stageRow}>
                      <span className={s.stageOrder}>{i + 1}</span>
                      <span className={s.stageName}>{platform?.name ?? stage.platform_slug}</span>
                      <select
                        className={`select ${s.stageModeSelect}`}
                        value={stage.progression_mode}
                        onChange={(e) =>
                          updateStage(i, {
                            progression_mode: e.target.value as 'Manual' | 'Automatic',
                            threshold: undefined,
                          })
                        }
                      >
                        <option value='Manual'>Manual</option>
                        <option value='Automatic'>Automatic</option>
                      </select>
                      {stage.progression_mode === 'Automatic' && (
                        <input
                          className={`input ${s.stageThresholdInput}`}
                          type='number'
                          placeholder='Threshold'
                          value={stage.threshold ?? ''}
                          onChange={(e) =>
                            updateStage(i, {
                              threshold: e.target.value === '' ? undefined : Number(e.target.value),
                            })
                          }
                        />
                      )}
                      <button
                        type='button'
                        className={s.stageRemove}
                        onClick={() => removeStage(i)}
                        aria-label={`Remove ${platform?.name ?? stage.platform_slug}`}
                      >
                        <i className='fa-solid fa-xmark' aria-hidden='true' />
                      </button>
                    </div>
                  );
                })}
              </div>
              <select
                className='select'
                value=''
                onChange={(e) => {
                  addStage(e.target.value);
                  e.target.value = '';
                }}
                style={{ marginTop: 8 }}
              >
                <option value=''>Add a pipeline stage…</option>
                {ATLAS_PLATFORMS.filter(
                  (p) => !atlasStages.some((s) => s.platform_slug === p.slug),
                ).map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className='field-hint'>Optional -- Automatic stages require a threshold.</span>
              <span className='field-error'>{errors.atlasStages}</span>
            </div>
          </>
        )}

        <div className={s.actions}>
          {step === 1 ? (
            <>
              <button type='button' className='btn btn-secondary' onClick={() => navigate('/')}>
                Cancel
              </button>
              <button type='button' className='btn btn-primary' onClick={goNext}>
                Continue <i className='fa-solid fa-arrow-right' aria-hidden='true' />
              </button>
            </>
          ) : (
            <>
              <button
                type='button'
                className='btn btn-secondary'
                onClick={() => setStep(1)}
                disabled={saving}
              >
                <i className='fa-solid fa-arrow-left' aria-hidden='true' /> Back
              </button>
              <button type='button' className='btn btn-primary' onClick={submit} disabled={saving}>
                {saving ? 'Creating…' : 'Create Case'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
