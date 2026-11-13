import { AlertTriangle } from 'lucide-react';
import { Button } from './button';

export interface ErrorStateProps {
  title: string;
  body: string;
  retryLabel: string;
  onRetry: () => void;
}

export function ErrorState({ title, body, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-coral-500" aria-hidden />
      <h2 className="font-heading text-h2 font-semibold text-ink">{title}</h2>
      <p className="max-w-md text-body text-muted">{body}</p>
      <Button variant="secondary" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
