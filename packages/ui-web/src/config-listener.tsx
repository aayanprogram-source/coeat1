'use client';

import { useEffect } from 'react';
import { useApi } from './api-provider';

/** Calls onChange whenever the published configuration version changes, so edits reach open screens at once. */
export function ConfigListener({ onChange }: { onChange: () => void }) {
  const api = useApi();
  useEffect(() => {
    const channel = api
      .channel('config-version')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config_version' }, onChange)
      .subscribe();
    return () => {
      void api.removeChannel(channel);
    };
  }, [api, onChange]);
  return null;
}
