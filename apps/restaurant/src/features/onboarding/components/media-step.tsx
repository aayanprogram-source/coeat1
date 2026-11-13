'use client';

import { Button, useApi, useRpcMutation, useT, useToast } from '@datapal/ui-web';
import { ImagePlus } from 'lucide-react';
import { useState } from 'react';
import { compressImage } from '@/lib/compress-image';

type Slot = 'logo' | 'cover';

function Upload({ label, file, url, onFile }: { label: string; file: File | null; url: string | null; onFile: (f: File) => void }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer flex-col gap-2 rounded-card border border-dashed border-line p-4 text-body text-ink focus-within:outline focus-within:outline-2 focus-within:outline-green-700">
      <span className="flex items-center gap-2">
        <ImagePlus className="h-5 w-5" aria-hidden /> {label}
      </span>
      {url || file ? (
        <img src={file ? URL.createObjectURL(file) : (url ?? '')} alt="" className="h-32 w-full rounded-input object-cover" />
      ) : null}
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </label>
  );
}

export function MediaStep({ restaurantId, logoUrl, coverUrl, onSaved }: { restaurantId: string; logoUrl: string | null; coverUrl: string | null; onSaved: () => void }) {
  const t = useT();
  const api = useApi();
  const toast = useToast();
  const update = useRpcMutation('update_restaurant');
  const [files, setFiles] = useState<Record<Slot, File | null>>({ logo: null, cover: null });
  const [busy, setBusy] = useState(false);
  const ready = (files.logo !== null || logoUrl !== null) && (files.cover !== null || coverUrl !== null);

  const save = async () => {
    setBusy(true);
    try {
      const paths: Record<string, string> = {};
      for (const slot of ['logo', 'cover'] as const) {
        const file = files[slot];
        if (!file) continue;
        const path = `${restaurantId}/${slot}-${Date.now()}.jpg`;
        const { error } = await api.storage.from('restaurant-media').upload(path, await compressImage(file, slot === 'logo' ? 512 : 1600), { contentType: 'image/jpeg' });
        if (error) throw error;
        paths[`${slot}_path`] = path;
      }
      if (Object.keys(paths).length > 0) await update.mutateAsync({ p_restaurant_id: restaurantId, p_details: paths as never });
      onSaved();
    } catch {
      toast.error(t('errors.unknown'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Upload label={t('rd.onboarding.logo')} file={files.logo} url={logoUrl} onFile={(f) => setFiles({ ...files, logo: f })} />
      <Upload label={t('rd.onboarding.cover')} file={files.cover} url={coverUrl} onFile={(f) => setFiles({ ...files, cover: f })} />
      <Button disabled={!ready} loading={busy} onClick={() => void save()}>
        {t('common.continue')}
      </Button>
    </div>
  );
}
