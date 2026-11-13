import { Chip, type ChipTone } from './chip';

const tones: Record<string, ChipTone> = {
  approved: 'success',
  active: 'success',
  paid: 'success',
  verified: 'success',
  fulfilled: 'success',
  tested: 'success',
  sent: 'success',
  pending: 'warning',
  pending_approval: 'warning',
  open: 'warning',
  issued: 'info',
  accrued: 'info',
  configured: 'info',
  scheduled: 'info',
  suspended: 'danger',
  rejected: 'danger',
  overdue: 'danger',
  reversed: 'danger',
  failed: 'danger',
  confirmed: 'danger',
};

export function StatusChip({ status }: { status: string }) {
  return <Chip tone={tones[status] ?? 'neutral'}>{status.replaceAll('_', ' ')}</Chip>;
}
