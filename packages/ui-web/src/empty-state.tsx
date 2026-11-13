import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-chip bg-mint-100 text-green-900">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="font-heading text-h2 font-semibold text-ink">{title}</h2>
      <p className="max-w-md text-body text-muted">{body}</p>
      {action}
    </div>
  );
}
