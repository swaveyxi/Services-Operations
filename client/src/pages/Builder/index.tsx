import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useServiceCall } from '@/hooks/useServiceCall';
import {
  listClients,
  getServiceCatalog,
  createCampaign,
  createClient,
  setClientAbbreviation,
  type ServiceCatalog,
} from '@/services';
import type { ClientContact, LineItem, Service } from '@shared/types';
import { BUSINESS_UNITS } from '@shared/constants';
import { matchAssociatedCosts, incomeToLineItem } from '@/utils/services';
import s from './Builder.module.css';

const dedupeKey = (i: LineItem) => i.acct_num || i.service_name;

export default function Builder() {
  const { userName, userEmail } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientContact[]>([]);
  const [unit, setUnit] = useState('');
  const [catalog, setCatalog] = useState<ServiceCatalog | null>(null);

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, call] = useServiceCall();

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

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!unit) e.unit = 'Select a business unit';
    if (!clientName.trim()) e.client = 'Client is required';
    if (!abbreviation.trim()) e.abbreviation = 'Abbreviation is required';
    if (revenueItems.length === 0) e.revenue = 'Add at least one revenue item';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
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
        client_id: clientIdForCase || null,
        description: description.trim() || null,
        revenue_items: revenueItems,
        cost_items: costItems,
      }),
    );
    if (campaign) navigate(`/tracker/${campaign.id}`);
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

      <div className='card card-pad'>
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
              <i className='fa-solid fa-circle-plus' aria-hidden='true' /> New client -- a contact
              record will be created on submit.
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

        {unit && (
          <>
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
              <span className='field-hint'>
                Dashed chips are auto-matched from revenue selections.
              </span>
            </div>
          </>
        )}

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

        <div className={s.actions}>
          <button type='button' className='btn btn-secondary' onClick={() => navigate('/')} disabled={saving}>
            Cancel
          </button>
          <button type='button' className='btn btn-primary' onClick={submit} disabled={saving}>
            {saving ? 'Creating…' : 'Create Case'}
          </button>
        </div>
      </div>
    </div>
  );
}
