import type { ReactNode } from 'react';
import s from './Shortlist.module.css';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Generic row shared by query matches, roster picks, and current members —
// each caller supplies whatever subtitle/tags make sense for that context.
export function CandidateRow({
  name,
  subtitle,
  tags,
  checked,
  onToggle,
  disabled,
  trailing,
}: {
  name: string;
  subtitle?: string;
  tags?: string[];
  checked?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <div className={`${s.row} ${checked ? s.selected : ''}`}>
      {onToggle && (
        <input type="checkbox" className={s.rowCheckbox} checked={!!checked} disabled={disabled} onChange={onToggle} />
      )}
      <div className={s.rowAvatar}>{initials(name)}</div>
      <div className={s.rowMain}>
        <div className={s.rowTop}>
          <span className={s.rowName}>{name}</span>
          {disabled && <span className="badge badge--neutral">Already a member</span>}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', lineHeight: 1.4 }}>{subtitle}</div>
        )}
        {tags && tags.length > 0 && (
          <div className={s.rowTags} style={{ marginTop: 'var(--space-2)' }}>
            {tags.map((t, i) => (
              <span key={i} className={s.rowTag}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      {trailing && <div className={s.rowActions}>{trailing}</div>}
    </div>
  );
}
