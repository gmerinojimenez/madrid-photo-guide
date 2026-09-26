import type { PreferencesStore } from '../storage/ports.ts';

/**
 * Caché local de titularidad (D-005, contracts/core-api.md §2.2). Es una
 * caché de conveniencia para el arranque: la autoridad es siempre la tienda
 * (FR-008).
 */
export interface EntitlementCache {
  /** `null` = nunca se ha sabido. Nunca lanza. */
  read(): Promise<boolean | null>;
  /** Nunca lanza: un fallo de escritura se registra y se descarta. */
  write(owned: boolean): Promise<void>;
}

const KEY = 'entitlement.owned';

/**
 * Implementación sobre el puerto `PreferencesStore` que ya existe (D-005).
 * Vive en el núcleo porque `PreferencesStore` también es del núcleo: no toca
 * SQLite, solo la interfaz.
 *
 * Regla de lectura: `'1'` → `true`; cualquier otro valor presente → `false`;
 * ausente → `null`. Un valor corrupto nunca concede acceso.
 */
export function preferencesEntitlementCache(prefs: PreferencesStore): EntitlementCache {
  return {
    async read() {
      const value = await prefs.get(KEY);
      if (value === null) return null;
      return value === '1';
    },
    async write(owned: boolean) {
      await prefs.set(KEY, owned ? '1' : '0');
    },
  };
}
