export type CsvRow = Record<string, string | number | null>;

function cell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Amounts in paise are written as rupees with two decimals so accountants can use them directly. */
export function toCsv(rows: CsvRow[]): string {
  const first = rows[0];
  if (!first) return '';
  const headers = Object.keys(first);
  const lines = rows.map((row) =>
    headers
      .map((h) => {
        const value = row[h] ?? null;
        return cell(h.endsWith('_paise') && typeof value === 'number' ? (value / 100).toFixed(2) : value);
      })
      .join(','),
  );
  return [headers.map((h) => h.replace(/_paise$/, '_inr')).join(','), ...lines].join('\n');
}
