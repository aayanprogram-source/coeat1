import type { LucideIcon } from 'lucide-react';
import { Card } from './card';
import { Skeleton } from './skeleton';

export interface KpiCardProps {
  label: string;
  value: string | null;
  icon: LucideIcon;
  hint?: string;
}

export function KpiCard({ label, value, icon: Icon, hint }: KpiCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-caption text-muted">
        <span>{label}</span>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      {value === null ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="font-heading text-display font-semibold tabular-nums text-ink">{value}</p>
      )}
      {hint ? <p className="text-caption text-muted">{hint}</p> : null}
    </Card>
  );
}
