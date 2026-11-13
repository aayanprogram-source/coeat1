import { describe, expect, it } from 'vitest';
import { createTranslator, errorKey } from './index';

describe('translator', () => {
  it('uses base strings and interpolates', () => {
    const { t } = createTranslator('en', {});
    expect(t('common.codes_left', { count: 7 })).toBe('7 codes left');
  });
  it('applies overrides by locale and falls back to en overrides', () => {
    const { t } = createTranslator('hi', {
      en: { 'common.continue': 'Go on' },
      hi: { 'common.back': 'पीछे' },
    });
    expect(t('common.back')).toBe('पीछे');
    expect(t('common.continue')).toBe('Go on');
  });
  it('maps database error codes to keys', () => {
    expect(errorKey('offer_sold_out')).toBe('errors.offer_sold_out');
    expect(errorKey('something_else')).toBe('errors.unknown');
  });
});
