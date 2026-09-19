import 'react-native-gesture-handler';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { InMemoryEntitlementSource } from '../src/core/entitlement/in-memory.ts';
import { migrate } from '../src/platform/storage/schema.ts';
import { consoleLogger } from '../src/platform/system/console-logger.ts';
import { colors } from '../src/ui/theme/tokens.ts';
import { CatalogProvider, EntitlementProvider, StoresProvider } from '../src/ui/providers/index.ts';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Única instancia por proceso: la titularidad de esta entrega no persiste
// (D-006, FR-029), así que vive en memoria mientras la app está abierta.
const entitlementSource = new InMemoryEntitlementSource();

/**
 * Stack raíz: `SafeAreaProvider` → `SQLiteProvider` → catálogo → titularidad →
 * almacenes → `Stack` (contracts/routes.md). Todavía sin la redirección
 * condicional a onboarding (regla R-1): llega en US3 (T055), para que US1 y US2
 * sean entregables por separado.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName="madrid-photo-guide.db"
        onInit={migrate}
        onError={(error) =>
          consoleLogger.discarded({ collection: 'sqlite', id: null, reason: error.message })
        }
      >
        <CatalogProvider>
          <EntitlementProvider source={entitlementSource}>
            <StoresProvider>
              <RootNavigator />
            </StoresProvider>
          </EntitlementProvider>
        </CatalogProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Solo se declara aquí lo que ya existe como fichero de ruta: declarar un
  // Stack.Screen sin fichero detrás produce el aviso "Too many screens defined"
  // de Expo Router. `onboarding`, `location/[id]`, `tip/[id]` y `paywall` se
  // añaden en las fases que crean esos ficheros (US1, US2, US3, US4).
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
