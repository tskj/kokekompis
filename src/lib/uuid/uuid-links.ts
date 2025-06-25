import { encodeUuidToBase32 } from './uuid-base32';

/**
 * Template string function that automatically encodes UUIDs to Base32 in hrefs
 *
 * Usage:
 * uuidHref`/kokebok/${cookbookId}/oppskrift/${recipeId}`
 */
export function uuidHref(strings: TemplateStringsArray, ...values: string[]): string {
  let result = '';

  for (let i = 0; i < strings.length; i++) {
    result += strings[i];

    if (i < values.length) {
      const value = values[i];
      result += encodeUuidToBase32(value);
    }
  }

  return result;
}
