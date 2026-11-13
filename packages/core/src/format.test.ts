import { describe, expect, it } from 'vitest';
import { formatCountdown, formatPaise, normalisePhone, slugify } from './format';

describe('format', () => {
  it('formats paise with Indian grouping', () => {
    expect(formatPaise(12345600)).toBe('₹1,23,456');
    expect(formatPaise(12345650)).toBe('₹1,23,456.50');
  });
  it('normalises Indian phone numbers', () => {
    expect(normalisePhone('98765 43210')).toBe('+919876543210');
    expect(normalisePhone('+91 98765-43210')).toBe('+919876543210');
    expect(normalisePhone('09876543210')).toBe('+919876543210');
  });
  it('formats countdowns', () => {
    expect(formatCountdown(65_000)).toBe('1:05');
    expect(formatCountdown(3_725_000)).toBe('1:02:05');
    expect(formatCountdown(0)).toBe('0:00');
  });
  it('slugifies', () => {
    expect(slugify('Café  Brûlée & Co.')).toBe('cafe-brulee-co');
  });
});
