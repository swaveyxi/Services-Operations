import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCampaign, createForm } from '@/services';
import { useServiceCall } from '@/hooks/useServiceCall';
import type { Campaign } from '@shared/types';
import { FORM_CATALOG_META } from '@shared/constants';
import { FORM_FIELDS, type Field } from './catalog';
import { FormRenderer, type FormValues } from './FormRenderer';
import s from './Forms.module.css';

function isVisible(field: Field, values: FormValues): boolean {
  if (
    field.kind === 'section' ||
    field.kind === 'subsection' ||
    field.kind === 'table' ||
    !('showIf' in field) ||
    !field.showIf
  )
    return true;
  const { field: dep, is, isNot, checked } = field.showIf;
  const v = values[dep];
  if (checked !== undefined) return Boolean(v) === checked;
  if (is !== undefined) return Array.isArray(v) ? (v as string[]).includes(is) : v === is;
  if (isNot !== undefined) return Array.isArray(v) ? !(v as string[]).includes(isNot) : v !== isNot;
  return true;
}

export default function Forms() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [selectedKey, setSelectedKey] = useState('');
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, call] = useServiceCall();

  useEffect(() => {
    getCampaign(id).then(setCampaign);
  }, [id]);

  const fields = useMemo(() => (selectedKey ? FORM_FIELDS[selectedKey] : []), [selectedKey]);

  function select(key: string) {
    setSelectedKey(key);
    setValues({});
    setErrors({});
    setSubmitted(false);
  }

  function onChange(id: string, value: unknown) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    for (const f of fields) {
      if (f.kind === 'section' || f.kind === 'subsection' || f.kind === 'table') continue;
      if (!('required' in f) || !f.required) continue;
      if (!isVisible(f, values)) continue;
      const v = values[f.id];
      const empty =
        v === undefined ||
        v === '' ||
        v === false ||
        (Array.isArray(v) && v.length === 0);
      if (empty) e[f.id] = `${f.label} is required`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    const meta = FORM_CATALOG_META[selectedKey];
    const result = await call(() =>
      createForm({
        campaign_id: campaign?.id || '',
        form_type: meta.title,
        operations_team: meta.operations_team,
        form_details: values,
      }),
    );
    if (result) {
      setSubmitted(true);
      setSelectedKey('');
      setValues({});
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Briefing Forms</h1>
          <p className="page-sub">
            {campaign ? (
              <>
                <span className="mono" style={{ color: 'var(--c-brand)' }}>
                  {campaign.campaign_id}
                </span>
              </>
            ) : (
              'Select a form to submit a brief.'
            )}
          </p>
        </div>
        {campaign && (
          <button className="btn btn-secondary" onClick={() => navigate(`/tracker/${campaign.id}`)}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to Case
          </button>
        )}
      </div>

      {submitted && (
        <div className={s.success}>
          <i className="fa-solid fa-circle-check" aria-hidden="true" /> Form submitted. Select
          another form or return to the case.
        </div>
      )}

      <div className="card card-pad" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="section-head">
          <h2 className="section-title">Choose a Form</h2>
        </div>
        <div className={s.grid}>
          {Object.entries(FORM_CATALOG_META).map(([key, meta]) => (
            <div
              key={key}
              className={`${s.formCard} ${selectedKey === key ? s.active : ''}`}
              onClick={() => select(key)}
            >
              <div className={s.formTitle}>{meta.title}</div>
              <span className={`badge badge--neutral ${s.formTeam}`}>{meta.operations_team}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedKey && (
        <div className={`card card-pad ${s.renderWrap}`}>
          <div className="section-head">
            <h2 className="section-title">{FORM_CATALOG_META[selectedKey].title}</h2>
          </div>
          <FormRenderer fields={fields} values={values} errors={errors} onChange={onChange} />
          <div className={s.actions}>
            <button className="btn btn-secondary" onClick={() => select('')}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Form'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
