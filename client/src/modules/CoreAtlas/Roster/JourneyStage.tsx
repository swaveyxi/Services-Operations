import type { ReactNode } from 'react';
import s from './CandidateProfile.module.css';

const LABEL: Record<'completed' | 'in_progress' | 'awaiting', string> = {
  completed: 'Completed',
  in_progress: 'In progress',
  awaiting: 'Awaiting',
};

export function JourneyStage({
  idx,
  title,
  status,
  last,
  children,
}: {
  idx: number;
  title: string;
  status: 'completed' | 'in_progress' | 'awaiting';
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${s.stage} ${s[status]} ${last ? s.last : ''}`}>
      <div className={`${s.stageDot} ${s[status]}`}>
        {status === 'completed' && <i className="fa-solid fa-check" aria-hidden="true" style={{ fontSize: '0.65rem' }} />}
        {status !== 'completed' && <span className={s.pulse} />}
      </div>
      <div className={s.stageHead}>
        <span className={s.stageIndex}>Stage 0{idx}</span>
        <span className={s.stageTitle}>{title}</span>
        <span className={`badge badge--${status === 'completed' ? 'positive' : status === 'in_progress' ? 'info' : 'neutral'}`}>
          {LABEL[status]}
        </span>
      </div>
      {children}
    </div>
  );
}
