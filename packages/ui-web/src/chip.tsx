import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type ChipTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<ChipTone, string> = {
  neutral: 'bg-background text-muted border-line',
  success: 'bg-mint-100 text-success border-transparent',
  warning: 'bg-[#FFF3D6] text-[#7A5200] border-transparent',
  danger: 'bg-[#FDE7E7] text-danger border-transparent',
  info: 'bg-mint-100 text-green-900 border-transparent',
};

export function Chip({ tone = 'neutral', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-chip border px-3 py-0.5 text-caption font-medium', tones[tone], className)}
      {...rest}
    />
  );
}
