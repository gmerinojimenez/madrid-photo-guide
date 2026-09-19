import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import type { PreferencesStore, SavedLocationsStore } from '../../core/storage/ports.ts';
import { createSqlitePreferencesStore } from '../../platform/storage/preferences.ts';
import { createSqliteSavedLocationsStore } from '../../platform/storage/saved-locations.ts';
import { consoleLogger } from '../../platform/system/console-logger.ts';

type Stores = { savedLocations: SavedLocationsStore; preferences: PreferencesStore };

const StoresContext = createContext<Stores | null>(null);

/**
 * Construye los almacenes sobre la base de datos que ya abrió `SQLiteProvider`
 * en el layout raíz (contracts/routes.md). Al montarse dentro de él, la base de
 * datos ya está lista: no hay un estado de carga propio que exponer.
 */
export function StoresProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();

  const stores = useMemo<Stores>(
    () => ({
      savedLocations: createSqliteSavedLocationsStore(db, consoleLogger),
      preferences: createSqlitePreferencesStore(db, consoleLogger),
    }),
    [db],
  );

  return <StoresContext.Provider value={stores}>{children}</StoresContext.Provider>;
}

export function useSavedLocationsStore(): SavedLocationsStore {
  const stores = useContext(StoresContext);
  if (!stores) throw new Error('useSavedLocationsStore() debe usarse dentro de <StoresProvider>');
  return stores.savedLocations;
}

export function usePreferencesStore(): PreferencesStore {
  const stores = useContext(StoresContext);
  if (!stores) throw new Error('usePreferencesStore() debe usarse dentro de <StoresProvider>');
  return stores.preferences;
}
