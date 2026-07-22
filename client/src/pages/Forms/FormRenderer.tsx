import type { Field, ShowIf } from './catalog';
import type { OneDriveFile } from '@shared/types';
import { AttachmentField } from '@/components/AttachmentField';

export type FormValues = Record<string, unknown>;
type Row = Record<string, string>;

function isVisible(showIf: ShowIf | undefined, values: FormValues): boolean {
  if (!showIf) return true;
  const v = values[showIf.field];
  if (showIf.checked !== undefined) return Boolean(v) === showIf.checked;
  if (showIf.is !== undefined)
    return Array.isArray(v) ? (v as string[]).includes(showIf.is) : v === showIf.is;
  if (showIf.isNot !== undefined)
    return Array.isArray(v) ? !(v as string[]).includes(showIf.isNot) : v !== showIf.isNot;
  return true;
}

export function FormRenderer({
  fields,
  values,
  errors,
  onChange,
}: {
  fields: Field[];
  values: FormValues;
  errors: Record<string, string>;
  onChange: (id: string, value: unknown) => void;
}) {
  return (
    <>
      {fields.map((f, idx) => {
        if (f.kind === 'section')
          return (
            <h3
              key={`s${idx}`}
              className="eyebrow"
              style={{ marginTop: idx === 0 ? 0 : 24, marginBottom: 12, fontSize: '0.75rem' }}
            >
              {f.label}
            </h3>
          );

        if (f.kind === 'subsection')
          return (
            <h4
              key={`ss${idx}`}
              style={{
                marginTop: 16,
                marginBottom: 8,
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--c-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {f.label}
            </h4>
          );

        const showIf = 'showIf' in f ? f.showIf : undefined;
        if (!isVisible(showIf, values)) return null;
        const err = 'id' in f ? errors[f.id] : undefined;

        if (f.kind === 'input') {
          return (
            <div className="field" key={f.id}>
              <label className="field-label">
                {f.label}
                {f.required && <span className="field-req">*</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  className="textarea"
                  placeholder={f.placeholder}
                  value={(values[f.id] as string) || ''}
                  onChange={(e) => onChange(f.id, e.target.value)}
                />
              ) : (
                <input
                  className="input"
                  type={f.type}
                  placeholder={f.placeholder}
                  readOnly={f.readonly}
                  value={(values[f.id] as string) || ''}
                  onChange={(e) => onChange(f.id, e.target.value)}
                />
              )}
              {f.hint && <span className="field-hint">{f.hint}</span>}
              {err && <span className="field-error">{err}</span>}
            </div>
          );
        }

        if (f.kind === 'check') {
          return (
            <div className="field" key={f.id}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(values[f.id])}
                  onChange={(e) => onChange(f.id, e.target.checked)}
                />
                <span className="field-label" style={{ marginBottom: 0 }}>
                  {f.label}
                  {f.required && <span className="field-req">*</span>}
                </span>
              </label>
              {err && <span className="field-error">{err}</span>}
            </div>
          );
        }

        if (f.kind === 'choice') {
          if (f.type === 'select') {
            return (
              <div className="field" key={f.id}>
                <label className="field-label">
                  {f.label}
                  {f.required && <span className="field-req">*</span>}
                </label>
                <select
                  className="select"
                  value={(values[f.id] as string) || ''}
                  onChange={(e) => onChange(f.id, e.target.value)}
                >
                  <option value="">Select…</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                {err && <span className="field-error">{err}</span>}
              </div>
            );
          }
          const multi = f.type === 'checkbox';
          const selected = multi ? ((values[f.id] as string[]) || []) : ((values[f.id] as string) || '');
          return (
            <div className="field" key={f.id}>
              <label className="field-label">
                {f.label}
                {f.required && <span className="field-req">*</span>}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem' }}>
                {f.options.map((o) => (
                  <label key={o} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type={multi ? 'checkbox' : 'radio'}
                      name={f.id}
                      checked={multi ? (selected as string[]).includes(o) : selected === o}
                      onChange={() => {
                        if (multi) {
                          const arr = selected as string[];
                          onChange(f.id, arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
                        } else onChange(f.id, o);
                      }}
                    />
                    {o}
                  </label>
                ))}
              </div>
              {err && <span className="field-error">{err}</span>}
            </div>
          );
        }

        if (f.kind === 'rating') {
          const current = (values[f.id] as Record<string, string>) || {};
          return (
            <div className="field" key={f.id}>
              <label className="field-label">{f.label}</label>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ minWidth: 400 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', width: '40%' }}></th>
                      {f.cols.map((c) => (
                        <th key={c} style={{ textAlign: 'center', fontSize: '0.78rem' }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {f.rows.map((row) => (
                      <tr key={row}>
                        <td style={{ fontSize: '0.85rem' }}>{row}</td>
                        {f.cols.map((col) => (
                          <td key={col} style={{ textAlign: 'center' }}>
                            <input
                              type="radio"
                              name={`${f.id}_${row}`}
                              checked={current[row] === col}
                              onChange={() => onChange(f.id, { ...current, [row]: col })}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {err && <span className="field-error">{err}</span>}
            </div>
          );
        }

        if (f.kind === 'onedrive-files') {
          return (
            <AttachmentField
              key={f.id}
              label={f.label}
              required={f.required}
              hint={f.hint}
              error={err}
              value={(values[f.id] as OneDriveFile[]) || []}
              onChange={(files) => onChange(f.id, files)}
            />
          );
        }

        // table
        const rows = (values[f.id] as Row[]) || [];
        const setRows = (next: Row[]) => onChange(f.id, next);
        return (
          <div className="field" key={f.id}>
            <label className="field-label">{f.label}</label>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    {f.columns.map((c) => (
                      <th key={c.id}>{c.label}</th>
                    ))}
                    <th style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri}>
                      {f.columns.map((c) => (
                        <td key={c.id}>
                          <input
                            className="input"
                            style={{ padding: '0.4rem' }}
                            type={c.type}
                            value={row[c.id] || ''}
                            onChange={(e) => {
                              const next = rows.map((r, i) =>
                                i === ri ? { ...r, [c.id]: e.target.value } : r,
                              );
                              setRows(next);
                            }}
                          />
                        </td>
                      ))}
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setRows(rows.filter((_, i) => i !== ri))}
                          aria-label="Remove row"
                        >
                          <i className="fa-solid fa-xmark" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 8 }}
              onClick={() => setRows([...rows, {}])}
            >
              <i className="fa-solid fa-plus" aria-hidden="true" /> Add Row
            </button>
          </div>
        );
      })}
    </>
  );
}

