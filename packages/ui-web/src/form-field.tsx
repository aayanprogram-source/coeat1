import { useId, type ReactElement, cloneElement } from 'react';

export interface FormFieldProps {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  optionalLabel?: string;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
}

export function FormField({ label, error, hint, optionalLabel, children }: FormFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-caption font-medium text-ink">
        {label}
        {optionalLabel ? <span className="ml-1 font-normal text-muted">{optionalLabel}</span> : null}
      </label>
      {cloneElement(children, { id, 'aria-invalid': Boolean(error), ...(describedBy ? { 'aria-describedby': describedBy } : {}) })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
