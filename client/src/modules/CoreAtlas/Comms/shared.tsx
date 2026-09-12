import { humanizeSlug } from '@/utils/format';
import s from './Comms.module.css';

export function stateTone(state: string): 'positive' | 'info' | 'negative' | 'pending' | 'neutral' {
  if (state === 'CLICKED' || state === 'OPENED' || state === 'RESPONDED' || state === 'DELIVERED') return 'positive';
  if (state === 'SENT' || state === 'PROCESSING') return 'info';
  if (state === 'FAILED') return 'negative';
  if (state === 'ESCALATED') return 'pending';
  return 'neutral';
}

export function StatePill({ state }: { state: string }) {
  return <span className={`badge badge--${stateTone(state)}`}>{humanizeSlug(state)}</span>;
}

const HEALTH: Record<string, { color: string; label: string }> = {
  healthy: { color: 'var(--t-positive-fg)', label: 'Healthy' },
  warning: { color: 'var(--t-pending-fg)', label: 'Warning' },
  critical: { color: 'var(--c-brand)', label: 'Critical' },
};

export function HealthDot({ health, withLabel }: { health: string; withLabel?: boolean }) {
  const m = HEALTH[health] ?? HEALTH.healthy;
  return (
    <span className={s.healthDot} style={{ color: m.color }}>
      <span className={s.dot} style={{ background: m.color }} />
      {withLabel && m.label}
    </span>
  );
}

export function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('');
}
