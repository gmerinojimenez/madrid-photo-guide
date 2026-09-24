/**
 * Dobles de los módulos nativos para Jest (T006, D-013 punto 3).
 *
 * `expo-maps`, `expo-sqlite`, `Linking.openURL` y `expo-clipboard` son módulos
 * nativos: no funcionan bajo Node. Aquí se sustituyen por implementaciones que
 * bastan para que los tests de aceptación ejerciten comportamiento real —el doble
 * de `expo-maps` renderiza cada marcador como un elemento pulsable con su nombre
 * accesible, y el de `expo-sqlite` es un motor mínimo en memoria que entiende
 * exactamente las sentencias que emiten los adaptadores de esta feature.
 *
 * `expo-location`, `Linking.openSettings` y `AppState` (T003, T004, feature
 * 004) siguen el mismo criterio: un doble controlable desde los tests, no una
 * simulación fiel del SDK.
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
    // Ayudante de test (T085): sustituye una base de datos por una que
    // rechaza cualquier llamada, para ejercitar la degradación de FR-028 de
    // punta a punta (arranque incluido), no solo en el adaptador aislado.
    __breakDatabase: (name: string) => {
      instances.set(
        name,
        new Proxy(getInstance(name), {
          get() {
            return () => Promise.reject(new Error('almacén roto (simulado, FR-028)'));
          },
        }),
      );
    },
  };
});

// ---------------------------------------------------------------------------
// Linking.openURL / openSettings (React Native core, no Expo)
// ---------------------------------------------------------------------------
import { AppState, Linking } from 'react-native';

beforeEach(() => {
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never);
});

// ---------------------------------------------------------------------------
// expo-clipboard
// ---------------------------------------------------------------------------
jest.mock('expo-clipboard', () => ({
  __esModule: true,
  setStringAsync: jest.fn(async () => true),
  getStringAsync: jest.fn(async () => ''),
}));

// ---------------------------------------------------------------------------
// expo-location (T003, feature 004)
//
// Estado controlable desde los tests con `__setLocationPermission`,
// `__answerNextRequestWith`, `__emitPosition` y `__setServicesEnabled`
// (research.md D-013). El adaptador de `src/platform/location/` traduce estas
// respuestas — con la misma forma que las reales de `expo-location`— al
// `RawPermission` del núcleo.
// ---------------------------------------------------------------------------
type MockPermissionState = 'undetermined' | 'granted' | 'approximate' | 'denied' | 'blocked';

// Declarado fuera del factory de `jest.mock`: Babel comprueba que el factory
// no referencie variables externas, y una declaración `type` local dentro de
// él dispara esa comprobación igual que una variable (aunque se borre al
// compilar). Un tipo de ámbito de módulo, en cambio, se borra antes de esa
// comprobación, igual que ya ocurre con `MockPermissionState` arriba.
type MockRawResponse = {
  status: 'undetermined' | 'granted' | 'denied';
  granted: boolean;
  canAskAgain: boolean;
  ios: { scope: 'none' | 'whenInUse'; accuracy: 'full' | 'reduced' };
  android: { accuracy: 'none' | 'fine' | 'coarse' };
};

// Mismo motivo: un tipo de función inline con un parámetro nombrado dentro de
// un genérico (`Set<(reading: unknown) => void>`) hace que Babel confunda el
// nombre del parámetro con una variable externa. Como alias de módulo, no.
type MockReadingListener = (reading: unknown) => void;

jest.mock('expo-location', () => {
  function responseFor(state: MockPermissionState): MockRawResponse {
    switch (state) {
      case 'undetermined':
        return {
          status: 'undetermined',
          granted: false,
          canAskAgain: true,
          ios: { scope: 'none', accuracy: 'full' },
          android: { accuracy: 'none' },
        };
      case 'granted':
        return {
          status: 'granted',
          granted: true,
          canAskAgain: true,
          ios: { scope: 'whenInUse', accuracy: 'full' },
          android: { accuracy: 'fine' },
        };
      case 'approximate':
        return {
          status: 'granted',
          granted: true,
          canAskAgain: true,
          ios: { scope: 'whenInUse', accuracy: 'reduced' },
          android: { accuracy: 'coarse' },
        };
      case 'denied':
        return {
          status: 'denied',
          granted: false,
          canAskAgain: true,
          ios: { scope: 'none', accuracy: 'full' },
          android: { accuracy: 'none' },
        };
      case 'blocked':
        return {
          status: 'denied',
          granted: false,
          canAskAgain: false,
          ios: { scope: 'none', accuracy: 'full' },
          android: { accuracy: 'none' },
        };
      default:
        throw new Error(`expo-location (doble): estado desconocido "${state}"`);
    }
  }

  let current: MockRawResponse = responseFor('undetermined');
  let nextAnswer: MockRawResponse | null = null;
  let servicesEnabled = true;
  const watchers = new Set<MockReadingListener>();

  const getForegroundPermissionsAsync = jest.fn(async () => current);
  // Sin diálogo real: si hay una respuesta preparada con
  // `__answerNextRequestWith`, la aplica (simula que la persona ha
  // respondido); si no, devuelve el estado vigente sin cambiarlo (simula que
  // el sistema no vuelve a preguntar, p. ej. en `blocked`).
  const requestForegroundPermissionsAsync = jest.fn(async () => {
    if (nextAnswer) {
      current = nextAnswer;
      nextAnswer = null;
    }
    return current;
  });
  const hasServicesEnabledAsync = jest.fn(async () => servicesEnabled);
  const watchPositionAsync = jest.fn(async (_options: unknown, callback: MockReadingListener) => {
    watchers.add(callback);
    return { remove: () => watchers.delete(callback) };
  });

  return {
    __esModule: true,
    Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6 },
    getForegroundPermissionsAsync,
    requestForegroundPermissionsAsync,
    hasServicesEnabledAsync,
    watchPositionAsync,
    /** Cambia el permiso "desde Ajustes": no simula una petición ni un diálogo. */
    __setLocationPermission: (state: MockPermissionState) => {
      current = responseFor(state);
    },
    /** Prepara la respuesta que dará la próxima `requestForegroundPermissionsAsync()`. */
    __answerNextRequestWith: (state: MockPermissionState) => {
      nextAnswer = responseFor(state);
    },
    __setServicesEnabled: (enabled: boolean) => {
      servicesEnabled = enabled;
    },
    /** Entrega una lectura a todos los `watchPositionAsync` activos. */
    __emitPosition: (coords: { lat: number; lng: number }) => {
      const reading = {
        coords: { latitude: coords.lat, longitude: coords.lng },
        timestamp: Date.now(),
      };
      watchers.forEach((callback) => callback(reading));
    },
    __activeWatcherCount: () => watchers.size,
    __resetLocation: () => {
      current = responseFor('undetermined');
      nextAnswer = null;
      servicesEnabled = true;
      watchers.clear();
      getForegroundPermissionsAsync.mockClear();
      requestForegroundPermissionsAsync.mockClear();
      hasServicesEnabledAsync.mockClear();
      watchPositionAsync.mockClear();
    },
  };
});

beforeEach(() => {
  const location = require('expo-location') as { __resetLocation: () => void };
  location.__resetLocation();
});

// ---------------------------------------------------------------------------
// AppState (T004, feature 004)
//
// El preset de Jest de React Native ya deja `AppState.addEventListener` como
// un `jest.fn()` que no invoca a nadie. Aquí se sustituye por una
// implementación que sí recuerda a los oyentes, para poder simular el paso a
// segundo plano y la vuelta con `__setAppState`.
// ---------------------------------------------------------------------------
const appStateListeners = new Set<(state: string) => void>();

beforeEach(() => {
  appStateListeners.clear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    type: string,
    handler: (state: string) => void,
  ) => {
    if (type === 'change') appStateListeners.add(handler);
    return { remove: () => appStateListeners.delete(handler) };
  }) as typeof AppState.addEventListener);
});

/**
 * Simula un cambio de estado de la app ('active' | 'background' | 'inactive').
 * `jest.setup.ts` no es un módulo que los tests puedan importar (es
 * `setupFilesAfterEnv`), así que se cuelga de `globalThis`, con su propio tipo
 * declarado en `__tests__/screens/support.ts`, que es quien lo reexporta.
 */
(globalThis as { __setAppState?: (state: string) => void }).__setAppState = (state: string) => {
  appStateListeners.forEach((handler) => handler(state));
};
