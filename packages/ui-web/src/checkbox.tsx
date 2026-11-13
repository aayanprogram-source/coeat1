import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import type { ToggleProps } from './toggle-props';

export function Checkbox({ checked, onCheckedChange, label, disabled }: ToggleProps) {
  return (
    <label className="flex min-h-[44px] items-center gap-3 text-body text-ink">
      <RadixCheckbox.Root
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        disabled={disabled}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-line bg-surface data-[state=checked]:border-green-900 data-[state=checked]:bg-green-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
      >
        <RadixCheckbox.Indicator>
          <Check className="h-4 w-4 text-white" aria-hidden />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label}
    </label>
  );
}
