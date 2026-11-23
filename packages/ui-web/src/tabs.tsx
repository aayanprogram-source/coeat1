import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ items, defaultValue }: { items: TabItem[]; defaultValue?: string }) {
  const first = items[0]?.value;
  return (
    <RadixTabs.Root defaultValue={defaultValue ?? first} className="flex flex-col gap-4">
      <RadixTabs.List className="inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl bg-ink/[0.05] p-1">
        {items.map((t) => (
          <RadixTabs.Trigger
            key={t.value}
            value={t.value}
            className="min-h-[40px] whitespace-nowrap rounded-xl px-4 text-[14px] font-semibold text-muted transition duration-base hover:text-ink data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((t) => (
        <RadixTabs.Content key={t.value} value={t.value} className="focus:outline-none">
          {t.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
