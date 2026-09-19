import type { SQLiteDatabase } from 'expo-sqlite';

import type { ContentLogger } from '../../core/content/logging.ts';
import type { PreferencesStore } from '../../core/storage/ports.ts';

/**
 * Adaptador de `PreferencesStore` sobre `expo-sqlite` (D-005), con la misma
 * degradación que `saved-locations.ts` (FR-028).
 */
export function createSqlitePreferencesStore(
  db: SQLiteDatabase,
  logger?: ContentLogger,
): PreferencesStore {
  function reportFailure(reason: unknown): void {
    logger?.discarded({
      collection: 'preferences',
      id: null,
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  }

  return {
    async get(key: string) {
      try {
        const row = await db.getFirstAsync<{ value: string }>(
          'SELECT value FROM preferences WHERE key = ?',
          [key],
        );
        return row?.value ?? null;
      } catch (error) {
        reportFailure(error);
        return null;
      }
    },

    async set(key: string, value: string) {
      try {
        const existing = await db.getFirstAsync<{ key: string }>(
          'SELECT key FROM preferences WHERE key = ?',
          [key],
        );
        if (existing) {
          await db.runAsync('UPDATE preferences SET value = ? WHERE key = ?', [value, key]);
        } else {
          await db.runAsync('INSERT INTO preferences (key, value) VALUES (?, ?)', [key, value]);
        }
      } catch (error) {
        reportFailure(error);
      }
    },
  };
}
