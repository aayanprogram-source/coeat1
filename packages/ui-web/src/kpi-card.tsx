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
    <Card className="flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-mid">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-muted">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint-100 text-primary">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>
      {value === null ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <p className="font-heading text-[34px] font-extrabold leading-none tracking-tight tabular-nums text-ink">{value}</p>
      )}
      {hint ? <p className="text-caption text-muted">{hint}</p> : null}
    </Card>
  );
}
