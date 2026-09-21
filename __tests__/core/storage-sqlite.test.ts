import { beforeEach } from '@jest/globals';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { createSqlitePreferencesStore } from '../../src/platform/storage/preferences.ts';
import { createSqliteSavedLocationsStore } from '../../src/platform/storage/saved-locations.ts';
import { migrate } from '../../src/platform/storage/schema.ts';
import type { PreferencesStore, SavedLocationsStore } from '../../src/core/storage/ports.ts';
import { runPreferencesContract, runSavedLocationsContract } from './storage-contract.ts';

/**
 * Ejecuta la misma batería de contrato de `storage.test.ts` contra el adaptador
 * real de `expo-sqlite` (T023), para que el doble en memoria y el adaptador
 * cumplan exactamente el mismo contrato (contracts/core-api.md). Usa el doble de
 * `expo-sqlite` de `jest.setup.ts`, con una base de datos nueva por caso.
 */
type ExpoSqliteMockModule = typeof import('expo-sqlite') & {
  __resetFakeDatabases: () => void;
};

let dbCounter = 0;

async function freshDatabase(): Promise<SQLiteDatabase> {
  const mod = require('expo-sqlite') as ExpoSqliteMockModule;
  mod.__resetFakeDatabases();
  const db = openDatabaseSync(`storage-contract-${dbCounter++}.db`);
  await migrate(db);
  return db;
}

// El "modo siempre falla" del doble en memoria no tiene equivalente literal en
// SQLite: aquí se simula envolviendo una base de datos ya migrada en un proxy
// que hace rechazar cualquier llamada, la misma clase de fallo que describe
// FR-028 ("el almacenamiento local no puede leerse").
async function brokenDatabase(): Promise<SQLiteDatabase> {
  const real = await freshDatabase();
  return new Proxy(real, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return () => Promise.reject(new Error('almacén roto (simulado, FR-028)'));
      }
      return value;
    },
  });
}

// El adaptador se crea UNA sola vez por store, no en cada llamada: guarda estado
// propio entre operaciones (el contador de recencia de `saved-locations.ts`), y
// recrearlo perdería ese estado.
function makeSavedLocationsStore(alwaysFail = false): SavedLocationsStore {
  const ready = (alwaysFail ? brokenDatabase() : freshDatabase()).then((db) =>
    createSqliteSavedLocationsStore(db),
  );

  return {
    async list() {
      return (await ready).list();
    },
    async save(locationId) {
      return (await ready).save(locationId);
    },
    async remove(locationId) {
      return (await ready).remove(locationId);
    },
    async has(locationId) {
      return (await ready).has(locationId);
    },
  };
}

function makePreferencesStore(alwaysFail = false): PreferencesStore {
  const ready = (alwaysFail ? brokenDatabase() : freshDatabase()).then((db) =>
    createSqlitePreferencesStore(db),
  );

  return {
    async get(key) {
      return (await ready).get(key);
    },
    async set(key, value) {
      return (await ready).set(key, value);
    },
  };
}

beforeEach(() => {
  dbCounter += 1000; // nombres únicos por test, sin depender del orden de ejecución
});

runSavedLocationsContract('adaptador expo-sqlite', makeSavedLocationsStore);
runPreferencesContract('adaptador expo-sqlite', makePreferencesStore);
