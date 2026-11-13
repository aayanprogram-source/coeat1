import { describe, expect, it } from 'vitest';
import { parseMenuCsv } from './menu-csv';

describe('parseMenuCsv', () => {
  it('reads rows, converts rupees to paise and handles quoted commas', () => {
    const result = parseMenuCsv('category,name,price,veg\nMains,"Dal, tadka",180.50,yes\nStarters,Kebab,250,no\n');
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { category: 'Mains', name: 'Dal, tadka', price_paise: 18050, is_veg: true },
      { category: 'Starters', name: 'Kebab', price_paise: 25000, is_veg: false },
    ]);
  });

  it('reports the line of each bad row and still returns the good ones', () => {
    const result = parseMenuCsv('category,name,price,veg\nMains,Dal,abc,yes\nMains,Rice,90,maybe\nMains,Naan,40,y');
    expect(result.rows).toHaveLength(1);
    expect(result.errors.map((e) => e.line)).toEqual([2, 3]);
  });

  it('rejects a file without the required header', () => {
    expect(parseMenuCsv('name,price\nDal,90').errors).toEqual([{ line: 1, message: 'header' }]);
  });
});
