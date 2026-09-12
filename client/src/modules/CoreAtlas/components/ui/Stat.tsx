import s from './ui.module.css';

export function Stat({
  value,
  label,
  tone = 'ink',
  small = false,
  divider = false,
}: {
  value: number | string;
  label: string;
  tone?: 'ink' | 'muted' | 'amber' | 'green' | 'red';
  small?: boolean;
  divider?: boolean;
}) {
  return (
    <div className={`${s.stat} ${divider ? s.divider : ''} ${small ? s.small : ''}`}>
      <div className={`${s.statValue} ${tone !== 'ink' ? s[tone] : ''} ${small ? s.small : ''}`}>{value}</div>
      <div className={s.statLabel}>{label}</div>
    </div>
  );
}
