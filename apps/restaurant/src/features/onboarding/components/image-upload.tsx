import { ImagePlus } from 'lucide-react';

export function Upload({ label, file, url, onFile }: { label: string; file: File | null; url: string | null; onFile: (f: File) => void }) {
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
