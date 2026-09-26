import { describe, expect, it } from '@jest/globals';

import { preferencesEntitlementCache } from '../../src/core/entitlement/cache.ts';
import { InMemoryPreferencesStore } from '../../src/core/storage/in-memory.ts';

describe('preferencesEntitlementCache', () => {
  it('lee `null` cuando la clave está ausente', async () => {
    const cache = preferencesEntitlementCache(new InMemoryPreferencesStore());
    expect(await cache.read()).toBeNull();
  });

  it("lee `true` cuando el valor almacenado es '1'", async () => {
    const prefs = new InMemoryPreferencesStore();
    await prefs.set('entitlement.owned', '1');
    const cache = preferencesEntitlementCache(prefs);
    expect(await cache.read()).toBe(true);
  });

  it("lee `false` cuando el valor almacenado es '0'", async () => {
    const prefs = new InMemoryPreferencesStore();
    await prefs.set('entitlement.owned', '0');
    const cache = preferencesEntitlementCache(prefs);
    expect(await cache.read()).toBe(false);
  });

  it('un valor corrupto nunca concede acceso: cualquier otro valor presente lee `false`', async () => {
    const prefs = new InMemoryPreferencesStore();
    await prefs.set('entitlement.owned', 'garbage');
    const cache = preferencesEntitlementCache(prefs);
    expect(await cache.read()).toBe(false);
  });

  it('write(true) persiste como \'1\' y se lee de vuelta como `true`', async () => {
    const prefs = new InMemoryPreferencesStore();
    const cache = preferencesEntitlementCache(prefs);
    await cache.write(true);
    expect(await prefs.get('entitlement.owned')).toBe('1');
    expect(await cache.read()).toBe(true);
  });

  it("write(false) persiste como '0'", async () => {
    const prefs = new InMemoryPreferencesStore();
    const cache = preferencesEntitlementCache(prefs);
    await cache.write(false);
    expect(await prefs.get('entitlement.owned')).toBe('0');
  });

  it('un fallo de escritura no rechaza la promesa (degradación de PreferencesStore)', async () => {
    const prefs = new InMemoryPreferencesStore(true);
    const cache = preferencesEntitlementCache(prefs);
    await expect(cache.write(true)).resolves.toBeUndefined();
  });
});
