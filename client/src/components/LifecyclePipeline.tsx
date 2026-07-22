import { Fragment } from 'react';
import { computeLifecycle, type LifecycleStep } from '@/utils/lifecycle';

type Props = {
  approval_status: string | null;
  campaign_status: string;
};

export function LifecyclePipeline(props: Props) {
  const steps: LifecycleStep[] = computeLifecycle(props);
  return (
    <div className="pipeline" role="list" aria-label="Case lifecycle">
      {steps.map((s, i) => (
        <Fragment key={s.label}>
          {i > 0 && <span className="pipeline-link" aria-hidden="true" />}
          <span
            role="listitem"
            className={`pipeline-step ${s.state === 'done' ? 'is-done' : ''} ${
              s.state === 'current' ? 'is-current' : ''
            }`}
          >
            <span className="pipeline-dot">{s.state === 'done' ? '✓' : i + 1}</span>
            {s.label}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
