import { Badge } from './Badge';
import {
  campaignStatusTone,
  approvalTone,
  opsTone,
  opsStatusLabel,
  deliveryTone,
  resolveDeliveryStatus,
  handoffTone,
  type BadgeTone,
} from '@/utils/status';
import { titleCase } from '@/utils/format';

type Kind = 'campaign' | 'workplan' | 'ops' | 'approval' | 'delivery' | 'form' | 'handoff';

export function StatusBadge({
  kind,
  value,
  submittedOn,
}: {
  kind: Kind;
  value: string;
  submittedOn?: string | null;
}) {
  if (kind === 'campaign') return <Badge tone={campaignStatusTone(value)}>{titleCase(value)}</Badge>;
  if (kind === 'approval') return <Badge tone={approvalTone(value)}>{titleCase(value)}</Badge>;
  if (kind === 'ops')
    return <Badge tone={opsTone(value)}>{titleCase(opsStatusLabel(value))}</Badge>;

  if (kind === 'workplan') {
    const v = value.toLowerCase();
    const tone: BadgeTone = v === 'configured' ? 'positive' : v === 'draft' ? 'pending' : 'neutral';
    return <Badge tone={tone}>{titleCase(value)}</Badge>;
  }
  if (kind === 'form') {
    const v = value.toLowerCase();
    const tone: BadgeTone = v === 'open' ? 'pending' : v === 'in progress' ? 'info' : 'neutral';
    return <Badge tone={tone}>{titleCase(value)}</Badge>;
  }
  if (kind === 'handoff') return <Badge tone={handoffTone(value)}>{value}</Badge>;
  // delivery
  const resolved = resolveDeliveryStatus(value, submittedOn);
  return <Badge tone={deliveryTone(resolved)}>{resolved}</Badge>;
}
