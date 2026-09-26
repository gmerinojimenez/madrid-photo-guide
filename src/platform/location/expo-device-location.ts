import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { DeviceLocation, RawPermission, RawReading } from '../../core/location/ports.ts';

/**
 * Adaptador de `expo-location` (research.md D-001, D-004). Único importador
 * de `expo-location` del proyecto: todo lo demás consume el puerto
 * `DeviceLocation` del núcleo.
 */
function flattenPermission(response: Location.LocationPermissionResponse): RawPermission {
  const precision: RawPermission['precision'] =
    Platform.OS === 'ios'
      ? response.ios?.accuracy === 'reduced'
        ? 'approximate'
        : response.ios?.accuracy === 'full'
          ? 'precise'
          : null
      : response.android?.accuracy === 'coarse'
        ? 'approximate'
        : response.android?.accuracy === 'fine'
          ? 'precise'
          : null;

  return {
    status: response.status,
    canAskAgain: response.canAskAgain,
    precision,
  };
}

export function createExpoDeviceLocation(): DeviceLocation {
  return {
    async getPermission(): Promise<RawPermission> {
      try {
        return flattenPermission(await Location.getForegroundPermissionsAsync());
      } catch {
        return { status: 'undetermined', canAskAgain: true, precision: null };
      }
    },

    async requestPermission(): Promise<RawPermission> {
      try {
        return flattenPermission(await Location.requestForegroundPermissionsAsync());
      } catch {
        return { status: 'undetermined', canAskAgain: true, precision: null };
      }
    },

    async servicesEnabled(): Promise<boolean> {
      try {
        return await Location.hasServicesEnabledAsync();
      } catch {
        return true;
      }
    },

    async watch(
      onReading: (reading: RawReading) => void,
      onError: (error: unknown) => void,
    ): Promise<() => void> {
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 25 },
        (position) => {
          onReading({
            coords: { lat: position.coords.latitude, lng: position.coords.longitude },
            timestamp: position.timestamp,
          });
        },
      );
      // `onError` no llega de watchPositionAsync (rechaza la promesa en su
      // lugar); se declara en el puerto por si otro adaptador sí la necesita.
      void onError;
      return () => subscription.remove();
    },
  };
}
