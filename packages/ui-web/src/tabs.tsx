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
      <RadixTabs.List className="flex gap-1 overflow-x-auto border-b border-line">
        {items.map((t) => (
          <RadixTabs.Trigger
            key={t.value}
            value={t.value}
            className="min-h-[44px] whitespace-nowrap border-b-2 border-transparent px-4 text-body text-muted data-[state=active]:border-saffron-500 data-[state=active]:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700"
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
