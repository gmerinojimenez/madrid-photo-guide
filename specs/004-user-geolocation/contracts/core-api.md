# Contract: API de núcleo añadida por esta feature

**Feature**: 004-user-geolocation

Módulos nuevos o ampliados del núcleo. Todos son **TypeScript puro**: no importan `react`,
`react-native` ni `expo-*`, y se ejercitan en Node sin simulador. Los tipos
(`PermissionState`, `UserPosition`, `LocationSnapshot`, `VisibleDistance`, `DistanceRadius`,
`ExplorationAvailability`) están definidos en [data-model.md](../data-model.md).

---

## `src/core/location/ports.ts`

### `DeviceLocation`

Puerto que implementa el adaptador de `expo-location` (`src/platform/location/`) y el doble
`InMemoryDeviceLocation` de los tests.

```ts
export type RawPermission = {
  status: 'undetermined' | 'granted' | 'denied';
  canAskAgain: boolean;
  /** Precisión concedida, ya aplanada por el adaptador desde ios.accuracy / android.accuracy. */
  precision: 'precise' | 'approximate' | null;
};

export type RawReading = { coords: LatLng; timestamp: number };

export interface DeviceLocation {
  getPermission(): Promise<RawPermission>;
  /** Lanza el diálogo del sistema. Solo se llama desde LocationTracker.request(). */
  requestPermission(): Promise<RawPermission>;
  servicesEnabled(): Promise<boolean>;
  /** Seguimiento en primer plano con umbral de 25 m. Devuelve la función para pararlo. */
  watch(onReading: (reading: RawReading) => void, onError: (error: unknown) => void): Promise<() => void>;
}
```

**Contrato**:

- Ningún método rechaza su promesa por un fallo del sistema, salvo `watch`, que puede
  rechazar si no hay permiso. Ante la duda, `getPermission` devuelve `undetermined` y
  `servicesEnabled` devuelve `true`.
- `watch` no emite lecturas en segundo plano. La función devuelta es idempotente.
- El adaptador es el único sitio del proyecto que importa `expo-location`.

---

## `src/core/location/permission.ts`

```ts
export function toPermissionState(raw: RawPermission): PermissionState;
export function permissionAction(state: PermissionState): 'request' | 'openSettings';
export function isGranted(state: PermissionState): state is 'granted' | 'approximate';
```

`toPermissionState` implementa la tabla de [research.md D-002](../research.md#d-002--modelo-de-estado-del-permiso).
Una respuesta `granted` con `precision: null` se trata como `granted`.

---

## `src/core/location/geo.ts`

```ts
export const PUERTA_DEL_SOL: LatLng;          // { lat: 40.416775, lng: -3.703790 }
export const MOVE_THRESHOLD_M = 25;
export const FAR_FROM_MADRID_M = 50_000;
export const STALE_AFTER_MS = 10 * 60_000;

export function distanceMeters(a: LatLng, b: LatLng): number;   // haversine
export function movedEnough(previous: LatLng | null, next: LatLng): boolean;
export function isFarFromMadrid(position: LatLng): boolean;     // > FAR_FROM_MADRID_M, estricto
export function isStale(position: UserPosition, now: number): boolean; // > STALE_AFTER_MS, estricto
```

**Contrato**: funciones puras. `distanceMeters(a, a) === 0`, simétrica y con error < 1 %
frente a las distancias de referencia de los tests (SC-002). `movedEnough(null, x)` es
`true`.

---

## `src/core/location/format.ts`

```ts
export function formatDistance(meters: number): string;          // "450 m" | "1,2 km"
export function formatVisibleDistance(d: VisibleDistance): { value: string; detail: string | null };
```

`value` es el texto principal ("1,2 km", "< 1 km", "~2,5 km", "Distancia no disponible").
`detail` es el texto secundario: las marcas ("aproximada", "posición antigua", unidas por
" · ") o, si no está disponible, el motivo ("Sin permiso de ubicación", "Ubicación
desactivada en el sistema", "Buscando tu posición…"). La tabla completa está en
[data-model.md §1](../data-model.md#visibledistance).

**Contrato**: 999,4 m → "999 m"; 999,6 m → "1,0 km" (el redondeo a metros llega a 1 000 y
pasa a km); 1 000 m → "1,0 km"; 12 345 m → "12,3 km". Siempre coma decimal, nunca punto.

---

## `src/core/location/exploration.ts`

```ts
export function explorationAvailability(snapshot: LocationSnapshot): ExplorationAvailability;
export function effectiveRadius(radius: DistanceRadius, availability: ExplorationAvailability): DistanceRadius;
export function withinRadius(distance: VisibleDistance, radius: DistanceRadius): boolean;
```

**Contrato**:

- `explorationAvailability` da prioridad a los motivos en este orden: `no-permission`,
  `services-off` (solo si no hay posición), `no-position`, `far-from-madrid`.
- `effectiveRadius` devuelve `'all'` si no está disponible.
- `withinRadius(_, 'all')` es siempre `true`. Con otro radio, `unavailable` nunca entra;
  `exact` compara `meters < límite`; `rounded` compara el valor mostrado (`under-1km` cuenta
  como < 1 000 m; `{ halfKm: n }` como n × 500 m) contra el límite, de forma estricta.

---

## `src/core/location/cache.ts`

```ts
export const LAST_POSITION_KEY = 'location.last';
export function serializePosition(position: UserPosition): string;
export function parsePosition(raw: string | null): UserPosition | null;   // source: 'cache'
```

**Contrato**: `parsePosition` nunca lanza. Devuelve `null` si `raw` es `null`, vacío, no es
JSON o no valida el esquema `zod` ([data-model.md §2](../data-model.md#2-persistencia)).

---

## `src/core/content/access.ts` (ampliado)

```ts
export function visibleDistance(
  location: Location,
  entitlement: Entitlement,
  snapshot: LocationSnapshot,
  now: number,
): VisibleDistance;
```

**Contrato**:

- Es la **única** función del proyecto que calcula la distancia entre la persona y una
  localización (FR-022). Ninguna pantalla llama a `distanceMeters` con coordenadas de
  contenido.
- Usa `accessOf` y `entitlement` con la misma regla que `viewLocation`: gratuita o con la
  compra → `exact`; de pago sin la compra → `rounded`.
- Para una de pago sin la compra, el resultado no contiene, en ningún campo, un número del
  que se pueda recuperar la distancia exacta ni las coordenadas (FR-020, SC-005). Los tests
  lo comprueban serializando el resultado.
- Sin posición o sin permiso → `unavailable` con el motivo de [data-model.md](../data-model.md#visibledistance).

---

## `src/core/location/tracker.ts`

### `LocationTracker`

```ts
export type PermissionOrigin = 'onboarding' | 'contextual' | 'profile';

export class LocationTracker {
  constructor(deps: {
    device: DeviceLocation;
    preferences: PreferencesStore;
    analytics: AnalyticsSink;
    now: () => number;
  });

  /** Lee permiso, servicios y caché. Se llama una vez al montar el proveedor. */
  start(): Promise<void>;
  snapshot(): LocationSnapshot;
  subscribe(listener: (snapshot: LocationSnapshot) => void): () => void;

  /** Lanza el diálogo del sistema salvo en `blocked`, emite el evento y aplica el resultado. */
  request(origin: PermissionOrigin): Promise<PermissionState>;

  /** App a primer plano: relee el sistema y rearranca el seguimiento si procede (FR-007). */
  resume(): Promise<void>;
  /** App a segundo plano: para el seguimiento (FR-013). */
  suspend(): void;
}
```

**Contrato**:

- Implementa las transiciones de [data-model.md §4](../data-model.md#4-transiciones-del-rastreador).
- `snapshot()` es síncrona y no lanza. Antes de que termine `start()` devuelve
  `{ permission: 'undetermined', servicesEnabled: true, position: null }`.
- `subscribe` no emite el estado inicial y solo notifica cambios reales (no notifica si el
  snapshot nuevo es igual al anterior).
- Nunca lanza por un fallo de `DeviceLocation` ni de `PreferencesStore`: degrada a "sin
  posición" y sigue funcionando (FR-026).
- `request` en `blocked` no llama a `requestPermission` ni emite evento.
- No hay temporizadores dentro del rastreador: la reevaluación periódica de la antigüedad es
  del proveedor de UI (research.md D-006), y el rastreador recibe el reloj por inyección.

### `InMemoryDeviceLocation` (`src/core/location/in-memory.ts`)

Doble para los tests unitarios.

```ts
export class InMemoryDeviceLocation implements DeviceLocation {
  constructor(initial?: Partial<{ permission: RawPermission; servicesEnabled: boolean }>);
  /** Respuesta que dará el próximo requestPermission(). */
  answerNextRequestWith(permission: RawPermission): void;
  /** Cambia el permiso "desde Ajustes": afecta a getPermission(), no notifica. */
  setPermission(permission: RawPermission): void;
  setServicesEnabled(enabled: boolean): void;
  /** Entrega una lectura a los watchers activos. */
  emit(reading: RawReading): void;
  /** Cuántos watchers activos hay (para comprobar que suspend() los para). */
  readonly activeWatchers: number;
  /** Cuántas veces se ha lanzado el diálogo (para SC-004). */
  readonly requestCount: number;
}
```

---

## `src/core/analytics/`

```ts
// events.ts — catálogo tipado (principio IV): ningún evento con strings sueltos
export type AnalyticsEvent = {
  name: 'location_permission_result';
  state: 'granted' | 'approximate' | 'denied';
  origin: PermissionOrigin;
};

// sink.ts
export interface AnalyticsSink {
  track(event: AnalyticsEvent): void;
}

// in-memory.ts — doble para tests
export class InMemoryAnalyticsSink implements AnalyticsSink {
  readonly events: AnalyticsEvent[];
  track(event: AnalyticsEvent): void;
}
```

**Contrato**: `track` es síncrona y no lanza. `AnalyticsEvent` es una unión discriminada por
`name`, pensada para crecer; esta feature añade solo el primer miembro. Ningún miembro puede
llevar coordenadas ni distancias (FR-027): lo comprueba un test sobre el tipo y otro sobre
los eventos emitidos.

La implementación de producción de esta entrega (`src/platform/system/console-analytics.ts`)
escribe el evento en consola. La sustituirá el adaptador de Firebase Analytics en la feature
de observabilidad, sin tocar el núcleo.
