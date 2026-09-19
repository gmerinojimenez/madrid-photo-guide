/**
 * Puertos de persistencia (D-005). El núcleo define la forma; el adaptador de
 * `expo-sqlite` vive en `src/platform/storage/` y los tests usan los dobles en
 * memoria de `in-memory.ts`.
 *
 * Degradación (FR-028), común a los dos puertos: una lectura que falla devuelve
 * el valor por defecto seguro y registra el fallo por `ContentLogger`; una
 * escritura que falla se registra y se descarta. Ningún método rechaza su
 * promesa por fallo de almacenamiento.
 */

export interface SavedLocationsStore {
  /** Identificadores guardados, del más reciente al más antiguo. */
  list(): Promise<string[]>;
  save(locationId: string): Promise<void>;
  remove(locationId: string): Promise<void>;
  has(locationId: string): Promise<boolean>;
}

export interface PreferencesStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}
