/**
 * Dobles de los módulos nativos para Jest (T006, D-013 punto 3).
 *
 * `expo-maps`, `expo-sqlite`, `Linking.openURL` y `expo-clipboard` son módulos
 * nativos: no funcionan bajo Node. Aquí se sustituyen por implementaciones que
 * bastan para que los tests de aceptación ejerciten comportamiento real —el doble
 * de `expo-maps` renderiza cada marcador como un elemento pulsable con su nombre
 * accesible, y el de `expo-sqlite` es un motor mínimo en memoria que entiende
 * exactamente las sentencias que emiten los adaptadores de esta feature.
 */
import { beforeEach, jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// expo-maps
// ---------------------------------------------------------------------------
jest.mock('expo-maps', () => {
  const React = require('react');
  const { View, Pressable, Text } = require('react-native');

  function FakeMapView({
    markers,
    annotations,
    onMarkerClick,
    onAnnotationClick,
    testID,
    lockedIds,
  }: any) {
    const items: any[] = markers ?? annotations ?? [];
    const handler = onMarkerClick ?? onAnnotationClick;
    const locked: Set<string> = new Set(lockedIds ?? []);
    return React.createElement(
      View,
      { testID: testID ?? 'location-map' },
      items.map((marker: any) =>
        React.createElement(
          Pressable,
          {
            key: marker.id,
            accessible: true,
            accessibilityRole: 'button',
            // El nombre accesible es SOLO el nombre de la localización
            // (contracts/screens.md): la distinción visual bloqueada/accesible
            // (FR-014) viaja en `testID`, nunca en el nombre.
            accessibilityLabel: marker.title,
            testID: `marker-${marker.id}-${locked.has(marker.id) ? 'locked' : 'open'}`,
            onPress: () => handler?.(marker),
          },
          React.createElement(Text, null, marker.title),
        ),
      ),
    );
  }

  return {
    GoogleMaps: { View: FakeMapView },
    AppleMaps: { View: FakeMapView },
    requestPermissionsAsync: jest.fn(async () => ({ granted: false, status: 'undetermined' })),
    getPermissionsAsync: jest.fn(async () => ({ granted: false, status: 'undetermined' })),
    useLocationPermissions: jest.fn(() => [
      { granted: false, status: 'undetermined' },
      jest.fn(),
      jest.fn(),
    ]),
  };
});

// ---------------------------------------------------------------------------
// expo-sqlite
//
// Motor mínimo en memoria (D-013 punto 3): entiende exactamente las sentencias
// que emiten `src/platform/storage/schema.ts`, `saved-locations.ts` y
// `preferences.ts`. Todo vive **dentro** del factory de `jest.mock`: Babel no
// permite que ese factory referencie variables externas (salvo con prefijo
// `mock`), así que la clase y su ayudante se declaran aquí en lugar de en el
// ámbito del módulo.
// ---------------------------------------------------------------------------
jest.mock('expo-sqlite', () => {
  const React = require('react');


  function normalizeStatement(source: string): string {
    return source.trim().replace(/\s+/g, ' ');
  }

  class MockSqliteDatabase {
    private tables = new Map<string, Record<string, unknown>[]>();
    private pragmaUserVersion = 0;

    async execAsync(source: string): Promise<void> {
      for (const statement of source.split(';').map((s) => s.trim()).filter(Boolean)) {
        this.execOne(statement);
      }
    }

    private execOne(statement: string): void {
      const createMatch = statement.match(/^CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
      if (createMatch) {
        const table = createMatch[1];
        if (!this.tables.has(table)) this.tables.set(table, []);
        return;
      }
      const pragmaSet = statement.match(/^PRAGMA\s+user_version\s*=\s*(\d+)/i);
      if (pragmaSet) {
        this.pragmaUserVersion = Number(pragmaSet[1]);
        return;
      }
      // Otras sentencias (índices, etc.) se ignoran silenciosamente: el doble
      // solo entiende lo que las migraciones de esta feature emiten.
    }

    async runAsync(source: string, params: unknown[] = []): Promise<{ changes: number }> {
      const stmt = normalizeStatement(source);

      const insertMatch = stmt.match(
        /^INSERT(?:\s+OR\s+REPLACE)?\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i,
      );
      if (insertMatch) {
        const table = insertMatch[1];
        const columns = insertMatch[2].split(',').map((c) => c.trim());
        const row: Record<string, unknown> = {};
        columns.forEach((col, i) => (row[col] = params[i]));
        this.tableRows(table).push(row);
        return { changes: 1 };
      }

      const deleteMatch = stmt.match(/^DELETE FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?/i);
      if (deleteMatch) {
        const table = deleteMatch[1];
        const column = deleteMatch[2];
        const rows = this.tableRows(table);
        const before = rows.length;
        const remaining = rows.filter((r) => r[column] !== params[0]);
        this.tables.set(table, remaining);
        return { changes: before - remaining.length };
      }

      const updateMatch = stmt.match(
        /^UPDATE\s+(\w+)\s+SET\s+(\w+)\s*=\s*\?\s+WHERE\s+(\w+)\s*=\s*\?/i,
      );
      if (updateMatch) {
        const table = updateMatch[1];
        const setCol = updateMatch[2];
        const whereCol = updateMatch[3];
        const rows = this.tableRows(table);
        let changes = 0;
        for (const row of rows) {
          if (row[whereCol] === params[1]) {
            row[setCol] = params[0];
            changes += 1;
          }
        }
        return { changes };
      }

      if (/^PRAGMA\s+user_version\s*=/i.test(stmt)) {
        this.execOne(stmt);
        return { changes: 0 };
      }

      throw new Error(`MockSqliteDatabase: sentencia no soportada: ${source}`);
    }

    async getFirstAsync<T = Record<string, unknown>>(source: string, params: unknown[] = []): Promise<T | null> {
      const stmt = normalizeStatement(source);
      if (/^PRAGMA\s+user_version\s*$/i.test(stmt)) {
        return { user_version: this.pragmaUserVersion } as unknown as T;
      }
      const rows = await this.getAllAsync<T>(source, params);
      return rows[0] ?? null;
    }

    async getAllAsync<T = Record<string, unknown>>(source: string, params: unknown[] = []): Promise<T[]> {
      const stmt = normalizeStatement(source);
      const selectMatch = stmt.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+(\w+)([\s\S]*)$/i);
      if (!selectMatch) {
        throw new Error(`MockSqliteDatabase: sentencia no soportada: ${source}`);
      }
      const [, columnsRaw, table, rest] = selectMatch;
      let rows = [...this.tableRows(table)];

      const whereMatch = rest.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (whereMatch) {
        const column = whereMatch[1];
        rows = rows.filter((r) => r[column] === params[0]);
      }

      const orderMatch = rest.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i);
      if (orderMatch) {
        const column = orderMatch[1];
        const direction = (orderMatch[2] ?? 'ASC').toUpperCase();
        rows.sort((a, b) => {
          const av = a[column] as number;
          const bv = b[column] as number;
          return direction === 'DESC' ? bv - av : av - bv;
        });
      }

      const columns = columnsRaw.trim();
      if (columns === '*') return rows as unknown as T[];
      const columnNames = columns.split(',').map((c) => c.trim());
      return rows.map((row) => {
        const projected: Record<string, unknown> = {};
        for (const name of columnNames) projected[name] = row[name];
        return projected;
      }) as unknown as T[];
    }

    async closeAsync(): Promise<void> {
      // no-op
    }

    private tableRows(table: string): Record<string, unknown>[] {
      if (!this.tables.has(table)) this.tables.set(table, []);
      return this.tables.get(table)!;
    }
  }

  const instances = new Map<string, MockSqliteDatabase>();

  function getInstance(name: string): MockSqliteDatabase {
    if (!instances.has(name)) instances.set(name, new MockSqliteDatabase());
    return instances.get(name)!;
  }

  const SQLiteContext = React.createContext(null);

  function openDatabaseSync(databaseName: string) {
    return getInstance(databaseName);
  }
  async function openDatabaseAsync(databaseName: string) {
    return getInstance(databaseName);
  }

  function SQLiteProvider({ databaseName, onInit, onError, children }: any) {
    const [ready, setReady] = React.useState(false);
    const dbRef = React.useRef(null) as { current: MockSqliteDatabase | null };
    React.useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const db = getInstance(databaseName);
          await onInit?.(db);
          if (!cancelled) {
            dbRef.current = db;
            setReady(true);
          }
        } catch (e) {
          onError?.(e as Error);
        }
      })();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [databaseName]);

    if (!ready || !dbRef.current) return null;
    return React.createElement(SQLiteContext.Provider, { value: dbRef.current }, children);
  }

  function useSQLiteContext() {
    const db = React.useContext(SQLiteContext);
    if (!db) throw new Error('useSQLiteContext must be used within a <SQLiteProvider>');
    return db;
  }

  return {
    __esModule: true,
    openDatabaseSync,
    openDatabaseAsync,
    SQLiteProvider,
    useSQLiteContext,
    __resetFakeDatabases: () => instances.clear(),
    // Ayudante de test (T052 en adelante): siembra una preferencia directamente
    // en el almacén de la app real ("madrid-photo-guide.db") antes de montar el
    // árbol de rutas, para los tests que no versan sobre la presentación
    // inicial y necesitan arrancar como si ya se hubiera visto.
    __seedPreference: async (key: string, value: string) => {
      const db = getInstance('madrid-photo-guide.db');
      await db.execAsync(
        'CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);',
      );
      await db.runAsync('INSERT INTO preferences (key, value) VALUES (?, ?)', [key, value]);
    },
  };
});

// ---------------------------------------------------------------------------
// Linking.openURL (React Native core, no Expo)
// ---------------------------------------------------------------------------
import { Linking } from 'react-native';

beforeEach(() => {
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
});

// ---------------------------------------------------------------------------
// expo-clipboard
// ---------------------------------------------------------------------------
jest.mock('expo-clipboard', () => ({
  __esModule: true,
  setStringAsync: jest.fn(async () => true),
  getStringAsync: jest.fn(async () => ''),
}));
