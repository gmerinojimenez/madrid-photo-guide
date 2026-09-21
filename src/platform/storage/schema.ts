import type { SQLiteDatabase } from 'expo-sqlite';

import type { ContentLogger } from '../../core/content/logging.ts';

/**
 * Esquema SQL y migraciones por `PRAGMA user_version` (data-model.md §1, D-005).
 * Esta feature introduce el tramo 0 → 1: crea `saved_locations` y `preferences`.
 * Versiones futuras solo añaden tramos nuevos; nunca se reescribe este.
 */
type Migration = { version: number; statements: string[] };

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS saved_locations (
        location_id TEXT PRIMARY KEY NOT NULL,
        saved_at INTEGER NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );`,
    ],
  },
];

/**
 * Aplica en orden los tramos de migración que falten y fija `user_version` a la
 * última versión conocida. Se invoca desde el `onInit` de `SQLiteProvider`.
 *
 * Degradación (FR-028): si abrir la base de datos o migrarla falla, **no se
 * propaga la excepción** — se registra por `ContentLogger` y se vuelve sin
 * hacer nada. `SQLiteProvider` sigue resolviendo, así que la app arranca
 * igual; los adaptadores que usan `db` después ya degradan por su cuenta
 * (T021/T022) ante una base de datos sin las tablas esperadas.
 */
export async function migrate(db: SQLiteDatabase, logger?: ContentLogger): Promise<void> {
  try {
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const currentVersion = row?.user_version ?? 0;

    let latestApplied = currentVersion;
    for (const migration of MIGRATIONS) {
      if (migration.version > currentVersion) {
        for (const statement of migration.statements) {
          await db.execAsync(statement);
        }
        latestApplied = migration.version;
      }
    }

    if (latestApplied > currentVersion) {
      await db.execAsync(`PRAGMA user_version = ${latestApplied}`);
    }
  } catch (error) {
    logger?.discarded({
      collection: 'sqlite',
      id: null,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
