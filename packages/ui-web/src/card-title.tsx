import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('font-heading text-h2 font-semibold text-ink', className)} {...rest} />;
}
