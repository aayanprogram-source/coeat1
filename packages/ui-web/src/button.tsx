import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'destructive';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-[0_8px_20px_-8px_rgba(216,67,31,0.65)] hover:-translate-y-px hover:bg-primary-hover hover:shadow-[0_12px_24px_-8px_rgba(216,67,31,0.7)]',
  secondary: 'border border-line bg-surface text-ink shadow-low hover:border-ink/25 hover:bg-surface',
  ghost: 'text-ink hover:bg-ink/5',
  accent: 'bg-accent text-ink shadow-[0_8px_20px_-8px_rgba(247,179,43,0.8)] hover:brightness-95',
  destructive: 'bg-danger text-white hover:brightness-95',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', loading = false, icon, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading}
      className={cn(
        'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-button px-5 text-[14.5px] font-semibold tracking-[0.005em] transition duration-base ease-out active:scale-[0.98]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
