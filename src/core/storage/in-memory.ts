import type { PreferencesStore, SavedLocationsStore } from './ports.ts';

/**
 * Doble en memoria de `SavedLocationsStore`, usado por los tests unitarios y de
 * aceptación (D-005). Acepta un modo "siempre falla" para ejercitar la
 * degradación del contrato sin necesidad de un dispositivo real.
 */
export class InMemorySavedLocationsStore implements SavedLocationsStore {
  private savedAt = new Map<string, number>();
  private sequence = 0;

  constructor(private readonly alwaysFail = false) {}

  async list(): Promise<string[]> {
    if (this.alwaysFail) return [];
    return [...this.savedAt.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([locationId]) => locationId);
  }

  async save(locationId: string): Promise<void> {
    if (this.alwaysFail) return;
    if (this.savedAt.has(locationId)) return; // idempotente: no cambia el orden original
    this.savedAt.set(locationId, this.sequence++);
  }

  async remove(locationId: string): Promise<void> {
    if (this.alwaysFail) return;
    this.savedAt.delete(locationId);
  }

  async has(locationId: string): Promise<boolean> {
    if (this.alwaysFail) return false;
    return this.savedAt.has(locationId);
  }
}

/**
 * Doble en memoria de `PreferencesStore`, con el mismo modo "siempre falla".
 */
export class InMemoryPreferencesStore implements PreferencesStore {
  private values = new Map<string, string>();

  constructor(private readonly alwaysFail = false) {}

  async get(key: string): Promise<string | null> {
    if (this.alwaysFail) return null;
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    if (this.alwaysFail) return;
    this.values.set(key, value);
  }
}
