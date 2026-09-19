import { describe, expect, it } from '@jest/globals';

import {
  composeImageKey,
  type ImageResolver,
  type ImageSource,
} from '../../src/core/content/images.ts';
import type { ImageRef } from '../../src/core/content/schema.ts';

describe('composeImageKey', () => {
  it('compone la clave para thumb', () => {
    const ref: ImageRef = { locationId: 'debod', usage: 'thumb', alt: { es: 'alt' } };
    expect(composeImageKey(ref)).toBe('debod/thumb');
  });

  it('compone la clave para detail', () => {
    const ref: ImageRef = { locationId: 'debod', usage: 'detail', alt: { es: 'alt' } };
    expect(composeImageKey(ref)).toBe('debod/detail');
  });

  it('compone la clave para extra-N', () => {
    const ref: ImageRef = { locationId: 'mayor', usage: 'extra', index: 0, alt: { es: 'alt' } };
    expect(composeImageKey(ref)).toBe('mayor/extra-0');
  });
});

describe('ImageResolver', () => {
  it('una referencia declarada y presente resuelve', () => {
    const source: ImageSource = { uri: 'bundled://debod-thumb' };
    const resolver: ImageResolver = {
      resolve: (ref) => (composeImageKey(ref) === 'debod/thumb' ? source : null),
    };
    const ref: ImageRef = { locationId: 'debod', usage: 'thumb', alt: { es: 'alt' } };
    expect(resolver.resolve(ref)).toBe(source);
  });

  it('una referencia ausente del registro devuelve null sin lanzar', () => {
    const resolver: ImageResolver = { resolve: () => null };
    const ref: ImageRef = { locationId: 'unknown', usage: 'thumb', alt: { es: 'alt' } };
    expect(() => resolver.resolve(ref)).not.toThrow();
    expect(resolver.resolve(ref)).toBeNull();
  });
});
