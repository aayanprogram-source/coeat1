import { menuCsvRowSchema, rupeesToPaise } from '@datapal/core';

export interface ParsedMenuRow {
  category: string;
  name: string;
  price_paise: number;
  is_veg: boolean;
}

export interface MenuCsvResult {
  rows: ParsedMenuRow[];
  errors: { line: number; message: string }[];
}

function splitLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else current += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      cells.push(current.trim());
      current = '';
    } else current += ch;
  }
  cells.push(current.trim());
  return cells;
}

/** Reads a menu from CSV text with the columns category, name, price (rupees) and veg (yes or no). */
export function parseMenuCsv(text: string): MenuCsvResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const [headerLine, ...body] = lines;
  const result: MenuCsvResult = { rows: [], errors: [] };
  if (!headerLine) return result;
  const header = splitLine(headerLine).map((h) => h.toLowerCase());
  const index = (name: string) => header.indexOf(name);
  if (['category', 'name', 'price', 'veg'].some((c) => index(c) === -1)) {
    result.errors.push({ line: 1, message: 'header' });
    return result;
  }
  body.forEach((line, i) => {
    const cells = splitLine(line);
    const parsed = menuCsvRowSchema.safeParse({
      category: cells[index('category')] ?? '',
      name: cells[index('name')] ?? '',
      price: cells[index('price')] ?? '',
      veg: (cells[index('veg')] ?? '').toLowerCase(),
    });
    if (!parsed.success) {
      result.errors.push({ line: i + 2, message: parsed.error.issues[0]?.path.join('.') ?? 'row' });
      return;
    }
    result.rows.push({ category: parsed.data.category, name: parsed.data.name, price_paise: rupeesToPaise(parsed.data.price), is_veg: parsed.data.veg });
  });
  return result;
}
