import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Configuración de RevenueCat leída de `expo.extra.revenuecat` (D-009).
 * `apiKey: null` ⇒ el adaptador no llama a `configure` y degrada a
 * `unavailable: 'store'` en todo.
 */
export type RevenueCatConfig = {
  apiKey: string | null;
  entitlementId: string;
};

const PLACEHOLDER_PREFIX = 'REPLACE_WITH_';

function isPlaceholder(value: string | undefined): value is undefined {
  return !value || value.startsWith(PLACEHOLDER_PREFIX);
}

/** Lee las claves públicas de `expo.extra.revenuecat` vía `expo-constants` (D-009). */
export function readRevenueCatConfig(): RevenueCatConfig {
  const extra = Constants.expoConfig?.extra?.revenuecat as
    { iosApiKey?: string; androidApiKey?: string; entitlementId?: string } | undefined;

  const rawKey = Platform.OS === 'ios' ? extra?.iosApiKey : extra?.androidApiKey;

  return {
    apiKey: isPlaceholder(rawKey) ? null : rawKey,
    entitlementId: extra?.entitlementId ?? '',
  };
}
