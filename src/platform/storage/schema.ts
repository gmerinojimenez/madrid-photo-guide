import type { SQLiteDatabase } from 'expo-sqlite';

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
 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
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
}
