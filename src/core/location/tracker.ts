import type { AnalyticsSink } from '../analytics/sink.ts';
import type { PreferencesStore } from '../storage/ports.ts';
import { LAST_POSITION_KEY, parsePosition, serializePosition } from './cache.ts';
import { movedEnough } from './geo.ts';
import { toPermissionState } from './permission.ts';
import type {
  DeviceLocation,
  LocationSnapshot,
  PermissionOrigin,
  PermissionState,
  PositionAccuracy,
  RawReading,
  UserPosition,
} from './ports.ts';

const INITIAL_SNAPSHOT: LocationSnapshot = {
  permission: 'undetermined',
  servicesEnabled: true,
  position: null,
};

function toEventState(state: PermissionState): 'granted' | 'approximate' | 'denied' {
  if (state === 'granted' || state === 'approximate') return state;
  // 'denied', 'blocked' y (en teoría inalcanzable) 'undetermined' se agrupan
  // como "denied" (FR-028): el evento no distingue una denegación temporal
  // de una permanente.
  return 'denied';
}

/**
 * Dueño único del estado de ubicación (research.md D-003, contracts/core-api.md).
 * Pura respecto a React: el proveedor de UI solo la conecta con `AppState` y
 * la publica por contexto. Nunca lanza por un fallo de `DeviceLocation` ni de
 * `PreferencesStore`: degrada a "sin posición" y sigue funcionando (FR-026).
 */
export class LocationTracker {
  private readonly device: DeviceLocation;
  private readonly preferences: PreferencesStore;
  private readonly analytics: AnalyticsSink;
  private readonly now: () => number;

  private current: LocationSnapshot = INITIAL_SNAPSHOT;
  private readonly listeners = new Set<(snapshot: LocationSnapshot) => void>();
  private stopWatch: (() => void) | null = null;
  /** Intención de seguir en primer plano: la fija `start()`/`resume()`/`suspend()`. */
  private foreground = false;

  constructor(deps: {
    device: DeviceLocation;
    preferences: PreferencesStore;
    analytics: AnalyticsSink;
    now: () => number;
  }) {
    this.device = deps.device;
    this.preferences = deps.preferences;
    this.analytics = deps.analytics;
    this.now = deps.now;
  }

  snapshot(): LocationSnapshot {
    return this.current;
  }

  subscribe(listener: (snapshot: LocationSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Lee permiso, servicios y caché. Se llama una vez al montar el proveedor. */
  async start(): Promise<void> {
    this.foreground = true;
    await this.reconcile();
  }

  /** App a primer plano: relee el sistema y rearranca el seguimiento si procede (FR-007). */
  async resume(): Promise<void> {
    this.foreground = true;
    await this.reconcile();
  }

  /** App a segundo plano: para el seguimiento (FR-013). */
  suspend(): void {
    this.foreground = false;
    this.stopWatching();
  }

  /** Lanza el diálogo del sistema salvo en `blocked`, emite el evento y aplica el resultado. */
  async request(origin: PermissionOrigin): Promise<PermissionState> {
    if (this.current.permission === 'blocked') {
      return this.current.permission;
    }

    let raw;
    try {
      raw = await this.device.requestPermission();
    } catch {
      return this.current.permission;
    }
    const permission = toPermissionState(raw);

    this.analytics.track({
      name: 'location_permission_result',
      state: toEventState(permission),
      origin,
    });

    await this.applyPermission(permission, this.current.servicesEnabled);
    return permission;
  }

  private async reconcile(): Promise<void> {
    let permission: PermissionState = this.current.permission;
    try {
      permission = toPermissionState(await this.device.getPermission());
    } catch {
      // se conserva el estado ya conocido
    }

    let servicesEnabled = this.current.servicesEnabled;
    try {
      servicesEnabled = await this.device.servicesEnabled();
    } catch {
      // se conserva el estado ya conocido
    }

    await this.applyPermission(permission, servicesEnabled);
  }

  private async applyPermission(
    permission: PermissionState,
    servicesEnabled: boolean,
  ): Promise<void> {
    if (permission === 'granted' || permission === 'approximate') {
      const position = this.current.position ?? (await this.loadCachedPosition());
      this.updateSnapshot({ permission, servicesEnabled, position });
      if (this.foreground) await this.startWatching();
    } else {
      this.stopWatching();
      this.updateSnapshot({ permission, servicesEnabled, position: null });
      await this.preferences.set(LAST_POSITION_KEY, '');
    }
  }

  private async loadCachedPosition(): Promise<UserPosition | null> {
    const raw = await this.preferences.get(LAST_POSITION_KEY);
    return parsePosition(raw);
  }

  private async startWatching(): Promise<void> {
    if (this.stopWatch) return;
    try {
      this.stopWatch = await this.device.watch(this.handleReading, () => {
        // Un fallo de lectura no cambia el estado: la posición conocida se conserva.
      });
    } catch {
      this.stopWatch = null;
    }
  }

  private stopWatching(): void {
    this.stopWatch?.();
    this.stopWatch = null;
  }

  private readonly handleReading = (reading: RawReading): void => {
    const current = this.current.position;
    // La primera lectura en vivo siempre se acepta, aunque esté a menos de
    // 25 m de la cacheada: cambia `source` de 'cache' a 'live' (data-model.md §1).
    const accept =
      current === null || current.source === 'cache' || movedEnough(current.coords, reading.coords);
    if (!accept) return;

    const accuracy: PositionAccuracy =
      this.current.permission === 'approximate' ? 'approximate' : 'precise';
    const position: UserPosition = {
      coords: reading.coords,
      accuracy,
      timestamp: reading.timestamp,
      source: 'live',
    };

    this.updateSnapshot({ ...this.current, position });
    void this.preferences.set(LAST_POSITION_KEY, serializePosition(position));
  };

  private updateSnapshot(next: LocationSnapshot): void {
    if (this.snapshotsEqual(this.current, next)) return;
    this.current = next;
    this.listeners.forEach((listener) => listener(this.current));
  }

  private snapshotsEqual(a: LocationSnapshot, b: LocationSnapshot): boolean {
    return (
      a.permission === b.permission &&
      a.servicesEnabled === b.servicesEnabled &&
      this.positionsEqual(a.position, b.position)
    );
  }

  private positionsEqual(a: UserPosition | null, b: UserPosition | null): boolean {
    if (a === null || b === null) return a === b;
    return (
      a.coords.lat === b.coords.lat &&
      a.coords.lng === b.coords.lng &&
      a.accuracy === b.accuracy &&
      a.timestamp === b.timestamp &&
      a.source === b.source
    );
  }
}
