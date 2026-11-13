import { Button, useT } from '@datapal/ui-web';
import { useState } from 'react';
import { AuditRow } from './audit-types';

export function Changes({ row }: { row: AuditRow }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? t('sa.audit.hide') : t('sa.audit.show')}
      </Button>
      {open ? (
        <div className="grid min-w-[320px] gap-2 sm:grid-cols-2">
          <pre className="max-h-48 overflow-auto rounded-input bg-background p-2 text-caption">{t('sa.audit.before')}: {JSON.stringify(row.before, null, 1)}</pre>
          <pre className="max-h-48 overflow-auto rounded-input bg-background p-2 text-caption">{t('sa.audit.after')}: {JSON.stringify(row.after, null, 1)}</pre>
        </div>
      ) : null}
    </div>
  );
}
