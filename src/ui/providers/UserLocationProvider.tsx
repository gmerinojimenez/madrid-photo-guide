import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { permissionAction } from '../../core/location/permission.ts';
import type { LocationSnapshot, PermissionOrigin } from '../../core/location/ports.ts';
import type { LocationTracker } from '../../core/location/tracker.ts';
import { LocationSheet } from '../sheets/LocationSheet.tsx';

/**
 * Los tres motivos por los que `ensureLocation` no puede completar la acción
 * de inmediato y necesita explicarse primero (research.md D-010).
 */
export type LocationSheetCase = 'denied' | 'blocked' | 'services-off';

export type LocationSheetRequest = {
  kind: LocationSheetCase;
  /** Qué botón principal ofrecer: pedir permiso u abrir Ajustes (contracts/screens.md). */
  primaryAction: 'request' | 'openSettings';
  onPrimaryAction: () => void;
  onDismiss: () => void;
};

type UserLocationContextValue = {
  snapshot: LocationSnapshot;
  now: number;
  /** Ejecuta `onGranted` si ya hay ubicación; si no, la pide o explica por qué no (R-G2). */
  ensureLocation: (origin: PermissionOrigin, onGranted?: () => void) => void;
  /**
   * Lanza el diálogo del sistema directamente, sin el panel de explicación de
   * `ensureLocation`: solo lo usa el paso de la presentación, que ya es en sí
   * mismo la explicación y siempre avanza al terminar (contracts/screens.md).
   */
  requestPermission: (origin: PermissionOrigin) => Promise<LocationSnapshot['permission']>;
  openSettings: () => void;
  /** Estado del panel de ubicación, consumido por `LocationSheet` (US2). */
  sheetRequest: LocationSheetRequest | null;
};

const UserLocationContext = createContext<UserLocationContextValue | null>(null);

// Mientras la posición vigente viene de la caché, se refresca `now`
// periódicamente para que la marca de antigüedad (FR-024) aparezca sin
// esperar a una lectura nueva (research.md D-006).
const CACHE_REFRESH_INTERVAL_MS = 60_000;

export function UserLocationProvider({
  tracker,
  openSettings,
  children,
}: {
  tracker: LocationTracker;
  openSettings: () => Promise<void>;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<LocationSnapshot>(() => tracker.snapshot());
  const [now, setNow] = useState<number>(() => Date.now());
  const [sheetRequest, setSheetRequest] = useState<LocationSheetRequest | null>(null);

  useEffect(() => {
    void tracker.start();
    return tracker.subscribe(setSnapshot);
  }, [tracker]);

  useEffect(() => {
    function handleChange(state: AppStateStatus) {
      if (state === 'active') {
        void tracker.resume();
        setNow(Date.now());
      } else {
        tracker.suspend();
      }
    }
    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, [tracker]);

  useEffect(() => {
    if (snapshot.position?.source !== 'cache') return;
    const interval = setInterval(() => setNow(Date.now()), CACHE_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [snapshot.position?.source]);

  function requestAndRun(origin: PermissionOrigin, onGranted?: () => void): void {
    void tracker.request(origin).then((result) => {
      if (result === 'granted' || result === 'approximate') onGranted?.();
    });
  }

  function ensureLocation(origin: PermissionOrigin, onGranted?: () => void): void {
    const current = tracker.snapshot();

    if (current.permission === 'granted' || current.permission === 'approximate') {
      if (!current.servicesEnabled) {
        setSheetRequest({
          kind: 'services-off',
          primaryAction: 'openSettings',
          onPrimaryAction: () => {
            setSheetRequest(null);
            void openSettings();
          },
          onDismiss: () => setSheetRequest(null),
        });
        return;
      }
      onGranted?.();
      return;
    }

    if (current.permission === 'undetermined') {
      requestAndRun(origin, onGranted);
      return;
    }

    // 'denied' o 'blocked': explicar antes de volver a preguntar o de mandar a Ajustes.
    const kind: LocationSheetCase = current.permission === 'blocked' ? 'blocked' : 'denied';
    const action = permissionAction(current.permission);
    setSheetRequest({
      kind,
      primaryAction: action,
      onPrimaryAction: () => {
        setSheetRequest(null);
        if (action === 'request') {
          requestAndRun(origin, onGranted);
        } else {
          void openSettings();
        }
      },
      onDismiss: () => setSheetRequest(null),
    });
  }

  const value = useMemo<UserLocationContextValue>(
    () => ({
      snapshot,
      now,
      ensureLocation,
      requestPermission: (origin) => tracker.request(origin),
      openSettings: () => void openSettings(),
      sheetRequest,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureLocation y openSettings cierran sobre `tracker`, estable por prop
    [snapshot, now, sheetRequest],
  );

  return (
    <UserLocationContext.Provider value={value}>
      {children}
      {/* Panel global (T043): sirve a todas las pantallas y es excluyente
          con los paneles propios de la pantalla activa, porque vive fuera
          de su árbol de componentes. */}
      <LocationSheet request={sheetRequest} />
    </UserLocationContext.Provider>
  );
}

export function useUserLocation(): UserLocationContextValue {
  const value = useContext(UserLocationContext);
  if (!value) throw new Error('useUserLocation() debe usarse dentro de <UserLocationProvider>');
  return value;
}
