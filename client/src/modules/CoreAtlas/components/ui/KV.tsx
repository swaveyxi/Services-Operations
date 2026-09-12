import type { ReactNode } from 'react';
import s from './ui.module.css';

export function KV({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className={s.kv}>
      <span className={s.kvLabel}>{label}</span>
      <span className={s.kvValue}>
        {value}
        {sub && <span className={s.kvSub}>{sub}</span>}
      </span>
    </div>
  );
}
