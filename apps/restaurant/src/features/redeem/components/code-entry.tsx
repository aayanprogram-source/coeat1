'use client';

import { Button, FormField, Input, useT } from '@datapal/ui-web';
import { ScanLine, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface CodeEntryProps {
  code: string;
  onCode: (code: string) => void;
  onLookup: () => void;
  onScan: () => void;
  busy: boolean;
}

export function CodeEntry({ code, onCode, onLookup, onScan, busy }: CodeEntryProps) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <FormField label={t('rd.redeem.code_label')}>
        <Input
          ref={input}
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={code}
          onChange={(e) => onCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && code.length === 4) onLookup();
          }}
          className="h-20 text-center font-heading text-[48px] tracking-[0.4em] tabular-nums"
        />
      </FormField>
      <div className="flex gap-3">
        <Button className="flex-1" icon={<Search className="h-4 w-4" aria-hidden />} disabled={code.length !== 4} loading={busy} onClick={onLookup}>
          {t('rd.redeem.lookup')}
        </Button>
        <Button variant="secondary" icon={<ScanLine className="h-4 w-4" aria-hidden />} onClick={onScan}>
          {t('rd.redeem.scan')}
        </Button>
      </div>
    </div>
  );
}
