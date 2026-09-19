import type { SQLiteDatabase } from 'expo-sqlite';

import type { ContentLogger } from '../../core/content/logging.ts';
import type { SavedLocationsStore } from '../../core/storage/ports.ts';

/**
 * Adaptador de `SavedLocationsStore` sobre `expo-sqlite` (D-005). Todo fallo se
 * envuelve en la degradación del contrato (FR-028): se registra por
 * `ContentLogger` y se responde con el valor por defecto seguro, sin propagar la
 * excepción a las pantallas.
 */
export function createSqliteSavedLocationsStore(
  db: SQLiteDatabase,
  logger?: ContentLogger,
): SavedLocationsStore {
  function reportFailure(reason: unknown): void {
    logger?.discarded({
      collection: 'saved_locations',
      id: null,
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  }

  // `Date.now()` a secas no basta para ordenar por recencia: dos guardados en el
  // mismo tick de JS pueden caer en el mismo milisegundo. Se combina con un
  // contador monótono por proceso para que el orden de inserción real nunca se
  // pierda, sin dejar de ser un timestamp epoch-ms creciente.
  let sequence = 0;
  function nextSavedAt(): number {
    return Date.now() * 1000 + (sequence++ % 1000);
  }

  return {
    async list() {
      try {
        const rows = await db.getAllAsync<{ location_id: string }>(
          'SELECT location_id FROM saved_locations ORDER BY saved_at DESC',
        );
        return rows.map((row) => row.location_id);
      } catch (error) {
        reportFailure(error);
        return [];
      }
    },

    async save(locationId: string) {
      try {
        const existing = await db.getFirstAsync<{ location_id: string }>(
          'SELECT location_id FROM saved_locations WHERE location_id = ?',
          [locationId],
        );
        if (existing) return; // idempotente: no cambia el orden original
        await db.runAsync('INSERT INTO saved_locations (location_id, saved_at) VALUES (?, ?)', [
          locationId,
          nextSavedAt(),
        ]);
      } catch (error) {
        reportFailure(error);
      }
    },

    async remove(locationId: string) {
      try {
        await db.runAsync('DELETE FROM saved_locations WHERE location_id = ?', [locationId]);
      } catch (error) {
        reportFailure(error);
      }
    },

    async has(locationId: string) {
      try {
        const row = await db.getFirstAsync(
          'SELECT location_id FROM saved_locations WHERE location_id = ?',
          [locationId],
        );
        return row != null;
      } catch (error) {
        reportFailure(error);
        return false;
      }
    },
  };
}
