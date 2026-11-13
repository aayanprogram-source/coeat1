export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center p-8 text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-green-700" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
