import { describe, expect, it } from '@jest/globals';

import { localize } from '../../src/core/content/localize';
import { localizedText } from '../../src/core/content/schema';

describe('localize', () => {
  it('returns the requested locale when present', () => {
    const text = { es: 'Hola', en: 'Hello' };
    expect(localize(text, 'en')).toBe('Hello');
  });

  it('falls back to Spanish when the requested locale is absent', () => {
    const text = { es: 'Hola' };
    expect(localize(text, 'en')).toBe('Hola');
  });

  it('rejects a piece with a missing base text as a validation error', () => {
    const result = localizedText.safeParse({ en: 'Hello' });
    expect(result.success).toBe(false);
  });
});
