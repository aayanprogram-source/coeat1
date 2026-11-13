import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('converts paise to rupees, renames the column and escapes commas and quotes', () => {
    const csv = toCsv([{ invoice_number: 'INV-1', restaurant: 'Spice, "Hut"', total_paise: 118000, bank_reference: null }]);
    expect(csv.split('\n')).toEqual([
      'invoice_number,restaurant,total_inr,bank_reference',
      'INV-1,"Spice, ""Hut""",1180.00,',
    ]);
  });

  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('');
  });
});
