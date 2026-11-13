import * as RadixSwitch from '@radix-ui/react-switch';
import type { ToggleProps } from './toggle-props';

export function Switch({ checked, onCheckedChange, label, disabled }: ToggleProps) {
  return (
    <label className="flex min-h-[44px] items-center gap-3 text-body text-ink">
      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative h-6 w-11 shrink-0 rounded-chip bg-line transition duration-fast data-[state=checked]:bg-green-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
      >
        <RadixSwitch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-chip bg-surface shadow-low transition duration-fast data-[state=checked]:translate-x-[22px]" />
      </RadixSwitch.Root>
      {label}
    </label>
  );
}
