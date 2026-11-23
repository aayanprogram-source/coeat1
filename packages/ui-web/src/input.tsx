import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

const field =
  'w-full rounded-input border border-line bg-surface px-3.5 text-[15px] text-ink shadow-low transition duration-base placeholder:text-muted/70 hover:border-ink/25 focus-visible:border-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-primary/20 aria-[invalid=true]:border-danger disabled:bg-background disabled:text-muted';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(field, 'min-h-[48px]', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(field, 'min-h-[96px] py-2', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn(field, 'min-h-[44px]', className)} {...rest}>
      {children}
    </select>
  );
});
