import { Check } from 'lucide-react';
import { cn } from './cn';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label={steps.join(', ')}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className="flex items-center gap-2 text-caption">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-chip border text-caption font-medium',
                done && 'border-green-900 bg-green-900 text-white',
                active && 'border-green-900 text-green-900',
                !done && !active && 'border-line text-muted',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn(active ? 'font-medium text-ink' : 'text-muted')}>{label}</span>
            {i < steps.length - 1 ? <span className="mx-1 h-px w-4 bg-line" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
