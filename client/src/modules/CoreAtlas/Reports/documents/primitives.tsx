import type { ReactNode } from 'react';
import s from './documents.module.css';

export function Mark() {
  return (
    <div className={s.mark}>
      <div className={s.markBadge}>D</div>
      <span className={s.markLabel}>DRAGNET</span>
    </div>
  );
}

export function Footer() {
  return (
    <div>
      <hr className={s.rule} style={{ opacity: 0.85 }} />
      <div className={s.foot}>
        Dragnet Solutions Ltd — 1676, Oladele Olashore, Victoria Island, Lagos.
      </div>
    </div>
  );
}

export function Page({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <div className={s.page}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
        <Mark />
      </div>
      {children}
      {footer && <Footer />}
    </div>
  );
}

export function H({ num, children, sub }: { num?: string; children: ReactNode; sub?: boolean }) {
  return (
    <h2 className={`${s.h} ${sub ? s.sub : ''}`}>
      {num && <span className={s.hNum}>{num}</span>}
      {children}
    </h2>
  );
}

export function H3({ num, children }: { num?: string; children: ReactNode }) {
  return (
    <h3 className={s.h3}>
      {num && <span className={s.h3Num}>{num}</span>}
      {children}
    </h3>
  );
}

export type DTableCol = { label: string; align?: 'left' | 'right'; w?: string };
export type DTableRow = { cells: ReactNode[]; tot?: boolean };

export function DTable({ cols, rows }: { cols: DTableCol[]; rows: DTableRow[] }) {
  return (
    <table className={s.table}>
      <thead>
        <tr>
          {cols.map((c, i) => (
            <th key={i} style={{ textAlign: c.align || 'left', width: c.w }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className={r.tot ? 'tot' : undefined}>
            {r.cells.map((cell, ci) => (
              <td key={ci} style={{ textAlign: cols[ci]?.align || 'left' }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Bullets({ items, ordered }: { items: ReactNode[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={s.bullets}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </Tag>
  );
}

export function SignOff() {
  return (
    <div className={s.signOff}>
      <div>&copy; Dragnet Solutions Limited</div>
    </div>
  );
}

// Generic label/value grid for `kind: 'metrics'` report sections — replaces
// the mock-specific PieBlock/PerfBars/FotBars charts, which assumed data
// shapes the real backend doesn't produce. Atlas's own report sections are
// deliberately generic ("a new report type needs no frontend change") — this
// is that contract's generic renderer, not a mock convenience.
export function MetricsGrid({ metrics }: { metrics: { label: string; value: number | string }[] }) {
  return (
    <div className={s.metricsGrid}>
      {metrics.map((m, i) => (
        <div key={i} className={s.metricCell}>
          <div className={s.metricLabel}>{m.label}</div>
          <div className={s.metricValue}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}
