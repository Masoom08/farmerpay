/**
 * i18n parity test — every key present in EN must exist in all other locales.
 * No orphan keys allowed (keys in hi/mr/te/kn/or that don't exist in en).
 */

import { resources, SUPPORTED_LOCALES, TRUST_NAMESPACE } from '../src/index';

type NestedObject = { [key: string]: string | NestedObject };

/**
 * Flatten a nested object into dot-separated keys.
 * e.g. { a: { b: "c" } } → ["a.b"]
 */
function flattenKeys(obj: NestedObject, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) {
      keys.push(...flattenKeys(v as NestedObject, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

const enKeys = flattenKeys(
  resources.en[TRUST_NAMESPACE] as unknown as NestedObject,
);

describe('Locale key parity', () => {
  const nonEnLocales = SUPPORTED_LOCALES.filter((l) => l !== 'en');

  test.each(nonEnLocales)('%s has every EN key', (locale) => {
    const localeData = resources[locale][TRUST_NAMESPACE] as unknown as NestedObject;
    const localeKeys = flattenKeys(localeData);

    const missingInLocale = enKeys.filter((k) => !localeKeys.includes(k));
    expect(missingInLocale).toEqual([]);
  });

  test.each(nonEnLocales)('%s has no orphan keys beyond EN', (locale) => {
    const localeData = resources[locale][TRUST_NAMESPACE] as unknown as NestedObject;
    const localeKeys = flattenKeys(localeData);

    const orphans = localeKeys.filter((k) => !enKeys.includes(k));
    expect(orphans).toEqual([]);
  });

  test('EN has at least 50 leaf keys', () => {
    // Sanity: make sure we actually have a meaningful set of translations
    expect(enKeys.length).toBeGreaterThanOrEqual(50);
  });
});

describe('TODO-marker locales', () => {
  test.each(['mr', 'te', 'kn', 'or'] as const)(
    '%s values have [TODO-%s] prefix',
    (locale) => {
      const localeData = resources[locale][TRUST_NAMESPACE] as unknown as NestedObject;

      function checkTodoPrefix(obj: NestedObject, path = ''): string[] {
        const violations: string[] = [];
        for (const [k, v] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${k}` : k;
          if (typeof v === 'object' && v !== null) {
            violations.push(...checkTodoPrefix(v as NestedObject, fullPath));
          } else if (typeof v === 'string' && !v.startsWith(`[TODO-${locale}]`)) {
            violations.push(fullPath);
          }
        }
        return violations;
      }

      const violations = checkTodoPrefix(localeData);
      expect(violations).toEqual([]);
    },
  );
});
