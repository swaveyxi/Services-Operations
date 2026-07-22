import type { SupportForm, OneDriveFile, LegacyAttachment } from '@shared/types';
import { formatDate } from '@/utils/format';
import { FORM_TITLE_TO_KEY } from '@shared/constants';
import { FORM_FIELDS } from '@/pages/Forms/catalog';
import { iconForFile } from '@/utils/fileIcon';
import s from './FormDetailBody.module.css';

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildLabelMap(formType: string): Record<string, string> {
  const key = FORM_TITLE_TO_KEY[formType];
  const fields = key ? (FORM_FIELDS[key] ?? []) : [];
  const map: Record<string, string> = {};
  for (const f of fields) {
    if ('id' in f) map[f.id] = f.label;
  }
  return map;
}

function scalar(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
}

type Row = Record<string, unknown>;
type Attachments = OneDriveFile[] | LegacyAttachment | null | undefined;

function isLegacyAttachment(v: unknown): v is LegacyAttachment {
  return (
    !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    ((v as LegacyAttachment).type === 'file' || (v as LegacyAttachment).type === 'link')
  );
}

function isOneDriveFileArray(v: unknown): v is OneDriveFile[] {
  return Array.isArray(v) && v.every((item) => item && typeof item === 'object' && 'web_url' in item);
}

function hasAttachment(v: Attachments): boolean {
  if (!v) return false;
  return Array.isArray(v) ? v.length > 0 : true;
}

/* Renders either the current OneDriveFile[] shape or a pre-connector legacy
   {type:'file'|'link', name?, value} record — old submissions keep rendering
   correctly even though new code never writes the legacy shape. */
function AttachmentDisplay({ value }: { value: Attachments }) {
  if (isOneDriveFileArray(value)) {
    if (value.length === 0) return null;
    return (
      <span className={s.fileList}>
        {value.map((f) => (
          <a
            key={`${f.drive_id}:${f.id}`}
            href={f.web_url}
            target="_blank"
            rel="noopener"
            className={s.fileChip}
          >
            <i className={`fa-solid ${iconForFile(f.name, f.mime_type)}`} aria-hidden="true" /> {f.name}
          </a>
        ))}
      </span>
    );
  }
  if (isLegacyAttachment(value)) {
    if (value.type === 'file') {
      if (value.value) {
        return (
          <a href={value.value} className={s.fileChip}>
            <i className="fa-solid fa-paperclip" aria-hidden="true" /> {value.name || 'Attachment'}
          </a>
        );
      }
      return (
        <span className={s.fileChip}>
          <i className="fa-solid fa-paperclip" aria-hidden="true" /> {value.name || 'Attachment'}
        </span>
      );
    }
    if (value.value) {
      return (
        <a href={value.value} target="_blank" rel="noopener" className={s.link}>
          <i className="fa-solid fa-link" aria-hidden="true" style={{ marginRight: 4 }} />
          {value.value}
        </a>
      );
    }
  }
  return null;
}

export function FormDetailBody({ form, hideMeta, campaignLabel, userMap }: { form: SupportForm; hideMeta?: boolean; campaignLabel?: string; userMap?: Record<string, string> }) {
  const fields = form.form_details || {};
  const labelMap = buildLabelMap(form.form_type);
  const ack = fields['_acknowledged'] as { by?: string; on?: string } | undefined;
  const handoff = fields['_handoff'] as
    | {
        team?: string; sentBy?: string; sentAt?: string;
        attachment?: Attachments;
        completedBy?: string; completedAt?: string;
        report?: Attachments;
      }
    | undefined;
  const completion = fields['_completion'] as
    | { completedBy?: string; completedOn?: string; note?: string; evidence?: Attachments }
    | undefined;

  const resolveName = (val?: string) => (val ? (userMap?.[val] ?? val) : '—');

  const metaPairs = [
    { label: 'Team', value: form.operations_team },
    { label: 'Campaign', value: campaignLabel ?? form.campaign_id },
    { label: 'Submitted by', value: form.submitter_name },
    { label: 'Submitted', value: formatDate(form.submitted_on) },
  ].filter((p) => p.value);

  const entries = Object.entries(fields).filter(
    ([k]) => k !== '_completion' && k !== '_acknowledged' && k !== '_handoff',
  );

  return (
    <>
      {!hideMeta && (
        <div className={s.meta}>
          {metaPairs.map((p) => (
            <span key={p.label} className={s.chip}>
              <span className={s.chipLabel}>{p.label}</span> {p.value}
            </span>
          ))}
        </div>
      )}

      <div className={s.fields}>
        {entries.length === 0 && <p className={s.empty}>No form details stored.</p>}
        {entries.map(([key, raw]) => (
          <div className={s.row} key={key}>
            <div className={s.label}>{labelMap[key] ?? formatLabel(key)}</div>
            <div className={s.value}>
              <FieldValue raw={raw} fieldKey={key} />
            </div>
          </div>
        ))}
      </div>

      {completion && (
        <div
          className={`${s.banner} ${s.bannerOk}`}
          style={{ flexDirection: 'column', alignItems: 'flex-start' }}
        >
          <span>
            <i className="fa-solid fa-circle-check" aria-hidden="true" /> Completed by{' '}
            {resolveName(completion.completedBy)} · {formatDate(completion.completedOn)}
          </span>
          {completion.note && <span className={s.bannerNote}>{completion.note}</span>}
          {hasAttachment(completion.evidence) && (
            <span style={{ marginTop: '0.35rem' }}>
              <AttachmentDisplay value={completion.evidence} />
            </span>
          )}
        </div>
      )}
      {handoff && (
        <div className={`${s.banner} ${s.bannerInfo}`} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <span>
            <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" /> Handed off to{' '}
            {handoff.team || '—'} by {resolveName(handoff.sentBy)} · {formatDate(handoff.sentAt)}
          </span>
          {hasAttachment(handoff.attachment) && (
            <span style={{ marginTop: '0.25rem' }}>
              <AttachmentDisplay value={handoff.attachment} />
            </span>
          )}
          {handoff.completedAt && (
            <>
              <span style={{ marginTop: '0.6rem', color: 'var(--t-positive-fg)', fontWeight: 600 }}>
                <i className="fa-solid fa-circle-check" aria-hidden="true" /> Completed by{' '}
                {resolveName(handoff.completedBy)} · {formatDate(handoff.completedAt)}
              </span>
              {hasAttachment(handoff.report) && (
                <span style={{ marginTop: '0.25rem' }}>
                  <AttachmentDisplay value={handoff.report} />
                </span>
              )}
            </>
          )}
        </div>
      )}
      {ack && (
        <div className={`${s.banner} ${s.bannerInfo}`}>
          <i className="fa-solid fa-circle-check" aria-hidden="true" /> Acknowledged by {resolveName(ack.by)}{' '}
          · {formatDate(ack.on)}
        </div>
      )}

      {(form.handoffs ?? []).map((h) => {
        const isCompleted = h.status === 'Completed';
        return (
          <div
            key={h.id}
            className={`${s.banner} ${isCompleted ? s.bannerOk : s.bannerInfo}`}
            style={{ flexDirection: 'column', alignItems: 'flex-start' }}
          >
            <span>
              {Boolean(h.auto) && <i className="fa-solid fa-bolt" aria-hidden="true" style={{ marginRight: 4 }} />}
              <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" style={{ marginRight: 4 }} />
              Handed off to <strong>{h.team}</strong>
              {' · '}
              <span style={{ fontWeight: 400, opacity: 0.75 }}>{h.status}</span>
              {' · '}
              <span style={{ fontWeight: 400 }}>by {resolveName(h.sent_by)} · {formatDate(h.sent_at)}</span>
            </span>
            {hasAttachment(h.attachment) && (
              <span style={{ marginTop: '0.25rem' }}>
                <AttachmentDisplay value={h.attachment} />
              </span>
            )}
            {h.acknowledged_by && (
              <span style={{ marginTop: '0.35rem', fontWeight: 400, fontSize: '0.8rem', opacity: 0.85 }}>
                <i className="fa-solid fa-eye" aria-hidden="true" style={{ marginRight: 4 }} />
                Acknowledged by {resolveName(h.acknowledged_by)}{h.acknowledged_at && ` · ${formatDate(h.acknowledged_at)}`}
              </span>
            )}
            {h.completed_by && (
              <span style={{ marginTop: '0.35rem', fontWeight: 600 }}>
                <i className="fa-solid fa-circle-check" aria-hidden="true" style={{ marginRight: 4 }} />
                Completed by {resolveName(h.completed_by)}{h.completed_at && ` · ${formatDate(h.completed_at)}`}
                {hasAttachment(h.report) && (
                  <span style={{ marginLeft: 8 }}>
                    <AttachmentDisplay value={h.report} />
                  </span>
                )}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

function FieldValue({ raw, fieldKey }: { raw: unknown; fieldKey: string }) {
  /* OneDrive attachment fields (current) and legacy file/link fields (historical) */
  if (isOneDriveFileArray(raw) || isLegacyAttachment(raw)) {
    return hasAttachment(raw) ? <AttachmentDisplay value={raw} /> : <span className={s.empty}>None</span>;
  }

  /* Plain objects (e.g. rating grids) */
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const pairs = Object.entries(raw as Row).filter(([, v]) => scalar(v) !== null);
    return <>{pairs.map(([k, v]) => `${formatLabel(k)}: ${v}`).join(' · ') || '—'}</>;
  }

  /* Arrays (e.g. table/session rows) */
  if (Array.isArray(raw)) {
    if (raw.length === 0) return <span className={s.empty}>None</span>;
    if (typeof raw[0] === 'object' && raw[0] !== null) {
      const SESSION_KEY_ORDER = ['startDate', 'startTime', 'endDate', 'endTime'];
      const rowNoun = fieldKey === 'testingSessions' ? 'Session' : 'Item';
      return (
        <div className={s.sessions}>
          {(raw as Row[]).map((row, i) => {
            const cells = Object.entries(row)
              .filter(([, v]) => scalar(v) !== null)
              .sort(([a], [b]) => {
                const ai = SESSION_KEY_ORDER.indexOf(a);
                const bi = SESSION_KEY_ORDER.indexOf(b);
                if (ai === -1 && bi === -1) return 0;
                if (ai === -1) return 1;
                if (bi === -1) return -1;
                return ai - bi;
              });
            return (
              <div className={s.session} key={i}>
                <div className={s.sessionTitle}>{rowNoun} {i + 1}</div>
                <div className={s.sessionGrid}>
                  {cells.map(([k, v]) => (
                    <span className={s.sessionCell} key={k}>
                      <b>{formatLabel(k)}:</b> {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return <>{(raw as unknown[]).join(', ')}</>;
  }

  const display = scalar(raw);
  if (display === null) return <span className={s.empty}>—</span>;
  return <span className={display.includes('\n') ? s.multiline : undefined}>{display}</span>;
}
