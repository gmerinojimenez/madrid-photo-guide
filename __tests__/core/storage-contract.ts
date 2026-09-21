import { describe, expect, it } from '@jest/globals';

import type { PreferencesStore, SavedLocationsStore } from '../../src/core/storage/ports.ts';

/**
 * Batería de contrato compartida (contracts/core-api.md). Se ejecuta contra el
 * doble en memoria (`__tests__/core/storage.test.ts`) y contra el adaptador de
 * SQLite (`__tests__/core/storage-sqlite.test.ts`), para que ambos cumplan
 * exactamente el mismo contrato.
 */
export function runSavedLocationsContract(
  label: string,
  makeStore: (alwaysFail?: boolean) => SavedLocationsStore,
): void {
  describe(`SavedLocationsStore — contrato (${label})`, () => {
    it('list() empieza vacío', async () => {
      const store = makeStore();
      expect(await store.list()).toEqual([]);
    });

    it('save() es idempotente: guardar dos veces no duplica ni cambia el orden', async () => {
      const store = makeStore();
      await store.save('debod');
      await store.save('sol');
      await store.save('debod');
      expect(await store.list()).toEqual(['sol', 'debod']);
    });

    it('remove() de algo no guardado no es un error', async () => {
      const store = makeStore();
      await expect(store.remove('no-existe')).resolves.toBeUndefined();
      expect(await store.list()).toEqual([]);
    });

    it('list() devuelve del más reciente al más antiguo', async () => {
      const store = makeStore();
      await store.save('debod');
      await store.save('sol');
      await store.save('mayor');
      expect(await store.list()).toEqual(['mayor', 'sol', 'debod']);
    });

    it('remove() quita solo la localización indicada', async () => {
      const store = makeStore();
      await store.save('debod');
      await store.save('sol');
      await store.remove('debod');
      expect(await store.list()).toEqual(['sol']);
    });

    it('has() refleja el estado guardado', async () => {
      const store = makeStore();
      expect(await store.has('debod')).toBe(false);
      await store.save('debod');
      expect(await store.has('debod')).toBe(true);
      await store.remove('debod');
      expect(await store.has('debod')).toBe(false);
    });

    it('degradación: un almacén que siempre falla responde con los valores por defecto seguros y no rechaza', async () => {
      const store = makeStore(true);
      await expect(store.save('debod')).resolves.toBeUndefined();
      await expect(store.remove('debod')).resolves.toBeUndefined();
      await expect(store.list()).resolves.toEqual([]);
      await expect(store.has('debod')).resolves.toBe(false);
    });
  });
}

export function runPreferencesContract(
  label: string,
  makeStore: (alwaysFail?: boolean) => PreferencesStore,
): void {
  describe(`PreferencesStore — contrato (${label})`, () => {
    it('get() de una clave ausente devuelve null', async () => {
      const store = makeStore();
      expect(await store.get('onboarding.completed')).toBeNull();
    });

    it('set() seguido de get() devuelve el valor escrito', async () => {
      const store = makeStore();
      await store.set('onboarding.completed', '1');
      expect(await store.get('onboarding.completed')).toBe('1');
    });

    it('set() sobre la misma clave sustituye el valor anterior', async () => {
      const store = makeStore();
      await store.set('onboarding.completed', '1');
      await store.set('onboarding.completed', '0');
      expect(await store.get('onboarding.completed')).toBe('0');
    });

    it('degradación: un almacén que siempre falla devuelve null y no rechaza', async () => {
      const store = makeStore(true);
      await expect(store.set('onboarding.completed', '1')).resolves.toBeUndefined();
      await expect(store.get('onboarding.completed')).resolves.toBeNull();
    });
  });
}
