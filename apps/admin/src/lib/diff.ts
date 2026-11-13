export interface DiffLine {
  kind: 'same' | 'added' | 'removed';
  text: string;
}

/** A line-level diff using the longest common subsequence, so reviewers see exactly what changed between versions. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const width = b.length + 1;
  const table = new Array<number>((a.length + 1) * width).fill(0);
  const at = (i: number, j: number) => table[i * width + j] ?? 0;
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] = a[i] === b[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1));
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] ?? '' });
      i += 1;
      j += 1;
    } else if (at(i + 1, j) >= at(i, j + 1)) {
      out.push({ kind: 'removed', text: a[i] ?? '' });
      i += 1;
    } else {
      out.push({ kind: 'added', text: b[j] ?? '' });
      j += 1;
    }
  }
  while (i < a.length) out.push({ kind: 'removed', text: a[i++] ?? '' });
  while (j < b.length) out.push({ kind: 'added', text: b[j++] ?? '' });
  return out;
}
