/* eslint-env jest */
import en from '../i18n/locales/en.json';
import vi from '../i18n/locales/vi.json';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => (
    flattenKeys(child, prefix ? `${prefix}.${key}` : key)
  ));
}

describe('locale key parity', () => {
  it('keeps English and Vietnamese locale keys synchronized', () => {
    const enKeys = flattenKeys(en).sort();
    const viKeys = flattenKeys(vi).sort();

    expect(viKeys).toEqual(enKeys);
  });
});
