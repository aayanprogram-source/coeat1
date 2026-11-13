import { describe, expect, it } from 'vitest';
import { settingsRegistry, validateSettingValue } from './settings-registry';

describe('settings registry', () => {
  it('has unique keys', () => {
    const keys = settingsRegistry.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('rejects values outside bounds', () => {
    expect(validateSettingValue('fee_percent_default', 101).ok).toBe(false);
    expect(validateSettingValue('fee_percent_default', 12).ok).toBe(true);
    expect(validateSettingValue('offers_need_approval', 'yes').ok).toBe(false);
    expect(validateSettingValue('nope', 1).ok).toBe(false);
  });

  it('initial values satisfy their own schema', () => {
    for (const def of settingsRegistry) {
      expect(validateSettingValue(def.key, def.initial).ok, def.key).toBe(true);
    }
  });
});
