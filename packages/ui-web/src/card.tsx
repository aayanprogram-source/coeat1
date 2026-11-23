import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card border border-line/70 bg-surface p-5 shadow-low transition duration-base ease-out', className)} {...rest} />;
}
