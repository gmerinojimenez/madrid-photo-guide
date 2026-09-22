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

// ---------------------------------------------------------------------------
// expo-constants (feature 004): claves de RevenueCat que `app.json` deja como
// marcadores de sustitución para producción. Los tests necesitan una clave
// real (cualquier cadena que no empiece por el marcador) para que el
// adaptador se configure y ejerza el doble de `react-native-purchases` de
// más abajo, en lugar de degradar por clave ausente (D-009).
// ---------------------------------------------------------------------------
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        revenuecat: {
          iosApiKey: 'test_ios_key',
          androidApiKey: 'test_android_key',
          entitlementId: 'full_guide',
        },
      },
    },
  },
}));

// ---------------------------------------------------------------------------
// react-native-purchases (feature 004, D-010)
//
// Motor mínimo: entiende exactamente la superficie de siete llamadas que usa
// `src/platform/purchases/revenuecat.ts` (D-003) y expone ayudantes de test
// para sembrar "esta cuenta ya compró", forzar un fallo de red, forzar una
// cancelación y empujar una revocación. Toda la lógica de negocio real —la
// reconciliación— se prueba sin este doble, en Node, contra un `StoreGateway`
// falso de quince líneas (__tests__/core/entitlement-store-backed.test.ts).
// ---------------------------------------------------------------------------
jest.mock('react-native-purchases', () => {
  const PURCHASES_ERROR_CODE = {
    PURCHASE_CANCELLED_ERROR: '1',
    STORE_PROBLEM_ERROR: '2',
    PURCHASE_NOT_ALLOWED_ERROR: '3',
    PRODUCT_ALREADY_PURCHASED_ERROR: '6',
    NETWORK_ERROR: '10',
    CONFIGURATION_ERROR: '23',
    OFFLINE_CONNECTION_ERROR: '35',
  };

  // `owned` es lo que refleja `customerInfo` (lo que ve `ownership()`/`observe()`).
  // `purchasedInStore` es lo que sabe la tienda de esta cuenta (lo que ve
  // `restore()`): en una instalación limpia puede haber una compra previa en
  // la cuenta sin que `owned` lo refleje todavía — es justo la asimetría que
  // hace falta el botón de restaurar en vez de que el arranque lo resuelva solo.
  let owned = false;
  let purchasedInStore = false;
  let failureMode: 'offline' | 'store' | 'not-allowed' | null = null;
  let cancelNext = false;
  const listeners = new Set<(customerInfo: unknown) => void>();

  const PACKAGE_FIXTURE = {
    identifier: 'full_guide_lifetime',
    packageType: 'LIFETIME',
    product: { identifier: 'full_guide_lifetime', priceString: '9,99 €' },
  };

  function customerInfo() {
    return { entitlements: { active: owned ? { full_guide: {} } : {} } };
  }

  function throwFor(code: string): never {
    const error: { code: string; message: string } = { code, message: `mock failure ${code}` };
    throw error;
  }

  function maybeThrowFailure(): void {
    if (failureMode === 'offline') throwFor(PURCHASES_ERROR_CODE.NETWORK_ERROR);
    if (failureMode === 'not-allowed') throwFor(PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR);
    if (failureMode === 'store') throwFor(PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR);
  }

  function notify(): void {
    const info = customerInfo();
    for (const listener of listeners) listener(info);
  }

  const Purchases = {
    configure: jest.fn(),
    isConfigured: jest.fn(async () => true),
    getCustomerInfo: jest.fn(async () => {
      maybeThrowFailure();
      return customerInfo();
    }),
    getOfferings: jest.fn(async () => {
      maybeThrowFailure();
      return {
        all: {},
        current: { lifetime: PACKAGE_FIXTURE, availablePackages: [PACKAGE_FIXTURE] },
      };
    }),
    purchasePackage: jest.fn(async () => {
      if (cancelNext) {
        cancelNext = false;
        throwFor(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR);
      }
      maybeThrowFailure();
      if (owned) throwFor(PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR);
      owned = true;
      purchasedInStore = true;
      const info = customerInfo();
      return { productIdentifier: PACKAGE_FIXTURE.identifier, customerInfo: info };
    }),
    restorePurchases: jest.fn(async () => {
      maybeThrowFailure();
      if (purchasedInStore) owned = true;
      return customerInfo();
    }),
    addCustomerInfoUpdateListener: jest.fn((listener: (customerInfo: unknown) => void) => {
      listeners.add(listener);
    }),
    removeCustomerInfoUpdateListener: jest.fn((listener: (customerInfo: unknown) => void) => {
      listeners.delete(listener);
    }),
  };

  return {
    __esModule: true,
    default: Purchases,
    PURCHASES_ERROR_CODE,
    // Ayudantes de test (D-010):
    /** Esta cuenta ya compró, y la app actual ya lo sabe (mismo dispositivo). */
    __seedPurchased: () => {
      owned = true;
      purchasedInStore = true;
    },
    /**
     * Esta cuenta ya compró, pero la app todavía no lo sabe: el caso de una
     * instalación limpia (US2 §1) donde `ownership()` no lo refleja hasta que
     * se pide `restore()` explícitamente.
     */
    __seedPurchasedElsewhere: () => {
      purchasedInStore = true;
    },
    __forceOffline: () => {
      failureMode = 'offline';
    },
    __forceStoreFailure: () => {
      failureMode = 'store';
    },
    __forceNotAllowed: () => {
      failureMode = 'not-allowed';
    },
    __clearFailure: () => {
      failureMode = null;
    },
    __forceCancelNext: () => {
      cancelNext = true;
    },
    __pushRevocation: () => {
      owned = false;
      purchasedInStore = false;
      notify();
    },
    __reset: () => {
      owned = false;
      purchasedInStore = false;
      failureMode = null;
      cancelNext = false;
      listeners.clear();
    },
  };
});

beforeEach(() => {
  const purchases = require('react-native-purchases') as { __reset: () => void };
  purchases.__reset();
});
