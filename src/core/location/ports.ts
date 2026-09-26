import type { LatLng } from '../content/schema.ts';

/**
 * Tipos de estado de ubicación (data-model.md §1) y puerto de acceso al
 * dispositivo (D-001). `expo-location` entra por el adaptador de
 * `src/platform/location/`, detrás de `DeviceLocation`; el núcleo no lo
 * importa.
 */

export type PermissionState = 'undetermined' | 'granted' | 'approximate' | 'denied' | 'blocked';

export type PermissionOrigin = 'onboarding' | 'contextual' | 'profile';

export type PositionAccuracy = 'precise' | 'approximate';

export type UserPosition = {
  coords: LatLng;
  accuracy: PositionAccuracy;
  timestamp: number;
  source: 'live' | 'cache';
};

export type LocationSnapshot = {
  permission: PermissionState;
  servicesEnabled: boolean;
  position: UserPosition | null;
};

export type UnavailableReason = 'no-permission' | 'services-off' | 'no-position';

export type DistanceMarks = { approximate: boolean; stale: boolean };

export type VisibleDistance =
  | ({ kind: 'exact'; meters: number } & DistanceMarks)
  | ({ kind: 'rounded'; band: 'under-1km' | { halfKm: number } } & DistanceMarks)
  | { kind: 'unavailable'; reason: UnavailableReason };

export type DistanceRadius = 'under-1km' | 'under-3km' | 'all';

export type ExplorationAvailability =
  { available: true } | { available: false; reason: UnavailableReason | 'far-from-madrid' };

/**
 * Respuesta del sistema, ya reducida por el adaptador a lo que el núcleo
 * necesita: sin distinguir SDK ni plataforma (contracts/core-api.md).
 */
export type RawPermission = {
  status: 'undetermined' | 'granted' | 'denied';
  canAskAgain: boolean;
  precision: PositionAccuracy | null;
};

export type RawReading = { coords: LatLng; timestamp: number };

/** Puerto que implementa el adaptador de `expo-location` y el doble en memoria de los tests. */
export interface DeviceLocation {
  getPermission(): Promise<RawPermission>;
  /** Lanza el diálogo del sistema. Solo se llama desde `LocationTracker.request()`. */
  requestPermission(): Promise<RawPermission>;
  servicesEnabled(): Promise<boolean>;
  /** Seguimiento en primer plano con umbral de 25 m. Devuelve la función para pararlo. */
  watch(
    onReading: (reading: RawReading) => void,
    onError: (error: unknown) => void,
  ): Promise<() => void>;
}
