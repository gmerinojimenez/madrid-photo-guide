import 'react-native-gesture-handler';

import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { InMemoryEntitlementSource } from '../src/core/entitlement/in-memory.ts';
import { migrate } from '../src/platform/storage/schema.ts';
import { consoleLogger } from '../src/platform/system/console-logger.ts';
import { colors } from '../src/ui/theme/tokens.ts';
import {
  CatalogProvider,
  EntitlementProvider,
  StoresProvider,
  usePreferencesStore,
} from '../src/ui/providers/index.ts';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Única instancia por proceso: la titularidad de esta entrega no persiste
// (D-006, FR-029), así que vive en memoria mientras la app está abierta.
const entitlementSource = new InMemoryEntitlementSource();

/**
 * Stack raíz: `SafeAreaProvider` → `SQLiteProvider` → catálogo → titularidad →
 * almacenes → `Stack` (contracts/routes.md), con la redirección condicional a
 * onboarding de la regla R-1.
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
              <RootNavigator />
            </StoresProvider>
          </EntitlementProvider>
        </CatalogProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
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
