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
      <div className="flex min-h-[40px] items-start justify-between gap-2">
        <span className="text-[12px] font-semibold uppercase leading-tight tracking-wide text-muted">{label}</span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint-100 text-primary">
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
