import 'react-native-gesture-handler';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { InMemoryEntitlementSource } from '../src/core/entitlement/in-memory.ts';
import { LocationTracker } from '../src/core/location/tracker.ts';
import { createExpoDeviceLocation } from '../src/platform/location/expo-device-location.ts';
import { consoleAnalytics } from '../src/platform/system/console-analytics.ts';
import { systemLinks } from '../src/platform/system/external.ts';
import { migrate } from '../src/platform/storage/schema.ts';
import { consoleLogger } from '../src/platform/system/console-logger.ts';
import { colors } from '../src/ui/theme/tokens.ts';
import {
  CatalogProvider,
  EntitlementProvider,
  StoresProvider,
  UserLocationProvider,
  usePreferencesStore,
} from '../src/ui/providers/index.ts';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Única instancia por proceso: la titularidad de esta entrega no persiste
// (D-006, FR-029), así que vive en memoria mientras la app está abierta.
const entitlementSource = new InMemoryEntitlementSource();

// Fuera del componente para que la regla de pureza de render no vea la
// llamada a `Date.now()` como parte del cuerpo de `useMemo` de abajo: el
// propio `LocationTracker` es quien la invoca, nunca el render.
function now(): number {
  return Date.now();
}

/**
 * Stack raíz: `SafeAreaProvider` → `SQLiteProvider` → catálogo → titularidad →
 * almacenes → ubicación → `Stack` (contracts/routes.md), con la redirección
 * condicional a onboarding de la regla R-1.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName="madrid-photo-guide.db"
        onInit={(db) => migrate(db, consoleLogger)}
        onError={(error) =>
          consoleLogger.discarded({ collection: 'sqlite', id: null, reason: error.message })
        }
      >
        <CatalogProvider>
          <EntitlementProvider
            source={entitlementSource}
            onPurchase={() => entitlementSource.grant()}
          >
            <StoresProvider>
              <RootUserLocationProvider>
                <RootNavigator />
              </RootUserLocationProvider>
            </StoresProvider>
          </EntitlementProvider>
        </CatalogProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

/**
 * Construye el único `LocationTracker` del proceso (research.md D-003) con el
 * `PreferencesStore` real, ya disponible dentro de `StoresProvider`, y lo
 * publica con `UserLocationProvider`.
 */
function RootUserLocationProvider({ children }: { children: ReactNode }) {
  const preferences = usePreferencesStore();
  const tracker = useMemo(
    () =>
      new LocationTracker({
        device: createExpoDeviceLocation(),
        preferences,
        analytics: consoleAnalytics,
        now,
      }),
    [preferences],
  );

  return (
    <UserLocationProvider tracker={tracker} openSettings={systemLinks.openSettings}>
      {children}
    </UserLocationProvider>
  );
}

function RootNavigator() {
  const preferences = usePreferencesStore();
  const router = useRouter();
  // `null` = todavía leyendo; mientras tanto se mantiene la pantalla de
  // arranque, para que el mapa no se vea ni por un fotograma antes de
  // redirigir (R-1). Se lee y se decide una sola vez al arrancar: la
  // redirección no debe repetirse cuando la propia presentación, más tarde,
  // escriba la marca y navegue por su cuenta.
  const [ready, setReady] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    let cancelled = false;
    preferences.get('onboarding.completed').then((value) => {
      if (cancelled) return;
      if (value !== '1' && !redirected.current) {
        redirected.current = true;
        router.replace('/onboarding');
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se ejecuta una sola vez al montar
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="location/[id]" />
      <Stack.Screen name="tip/[id]" />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
