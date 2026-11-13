import { diffLines } from '@/lib/diff';

const styles = {
  same: 'text-muted',
  added: 'bg-mint-100 text-success',
  removed: 'bg-[#FDE7E7] text-danger line-through',
} as const;

export function DiffView({ before, after }: { before: string; after: string }) {
  const lines = diffLines(before, after);
  return (
    <pre className="max-h-96 overflow-auto rounded-input border border-line bg-surface p-3 text-caption">
      {lines.map((line, i) => (
        <div key={i} className={styles[line.kind]}>
          {line.kind === 'added' ? '+ ' : line.kind === 'removed' ? '- ' : '  '}
          {line.text}
        </div>
      ))}
    </pre>
  );
}
