# Data Model: Geolocalización de la persona usuaria

**Feature**: 004-user-geolocation | **Fecha**: 2026-09-24

Entidades nuevas del núcleo, el único dato persistido y los estados de la feature. Las
entidades de contenido (`Location`, `LocationPreview`, `LatLng`) no cambian. La API que opera
sobre estas entidades está en [contracts/core-api.md](./contracts/core-api.md).

---

## 1. Entidades del núcleo (`src/core/location/`)

### `PermissionState`

```ts
type PermissionState = 'undetermined' | 'granted' | 'approximate' | 'denied' | 'blocked';
```

Traducción de la respuesta del sistema en [research.md D-002](./research.md#d-002--modelo-de-estado-del-permiso).
Etiqueta visible en el perfil (FR-009):

| Estado | Etiqueta | Acción de la fila |
|---|---|---|
| `undetermined` | "Sin pedir" | pedir permiso |
| `granted` | "Concedida" | abrir Ajustes |
| `approximate` | "Aproximada" | abrir Ajustes |
| `denied` | "Denegada" | pedir permiso |
| `blocked` | "Denegada" | abrir Ajustes |

### `UserPosition`

| Campo | Tipo | Notas |
|---|---|---|
| `coords` | `LatLng` | el tipo del catálogo, `{ lat, lng }` |
| `accuracy` | `'precise' \| 'approximate'` | derivado del permiso vigente al recibir la lectura, no del radio de error |
| `timestamp` | `number` | ms desde epoch, momento de la lectura según el sistema |
| `source` | `'live' \| 'cache'` | `cache` si se cargó de `location.last` al arrancar |

**Reglas**:

- Una lectura nueva se acepta solo si está a 25 m o más de la última aceptada
  (`movedEnough`). La primera lectura en vivo siempre se acepta, aunque esté a menos de
  25 m de la cacheada, porque cambia `source` de `cache` a `live`.
- Es **antigua** si `now - timestamp > 10 min` (FR-024).
- Vive en memoria. Solo la última aceptada se persiste (§2).

### `LocationSnapshot`

El estado completo que el rastreador publica.

| Campo | Tipo | Notas |
|---|---|---|
| `permission` | `PermissionState` | |
| `servicesEnabled` | `boolean` | servicios de ubicación del sistema; `true` si no se sabe |
| `position` | `UserPosition \| null` | siempre `null` si `permission` no es `granted` ni `approximate` |

**Invariante**: `permission ∈ {undetermined, denied, blocked} ⇒ position === null`.

### `VisibleDistance`

Lo único que la UI sabe de la distancia a una localización. Lo produce `visibleDistance` en
el módulo de acceso (research.md D-007).

```ts
type DistanceMarks = { approximate: boolean; stale: boolean };

type VisibleDistance =
  | ({ kind: 'exact'; meters: number } & DistanceMarks)                    // accesible
  | ({ kind: 'rounded'; band: 'under-1km' | { halfKm: number } } & DistanceMarks) // bloqueada
  | { kind: 'unavailable'; reason: UnavailableReason };

type UnavailableReason = 'no-permission' | 'services-off' | 'no-position';
```

**Reglas de validación**:

- `rounded` **no tiene** `meters`: la distancia exacta de una bloqueada no existe fuera del
  núcleo (FR-020).
- `halfKm` es un entero ≥ 2: `band = 'under-1km'` si la distancia exacta es < 1 000 m; si
  no, `halfKm = round(metros / 500)`.
- `approximate` es verdadero si `position.accuracy === 'approximate'`; `stale`, si la
  posición es antigua.
- `reason`: `no-permission` si el permiso no está concedido; `services-off` si está
  concedido pero los servicios están apagados y no hay posición; `no-position` si está
  concedido y no hay ninguna lectura ni caché.

**Texto visible** (`formatVisibleDistance`):

| Valor | Texto |
|---|---|
| `exact`, 450 m | "450 m" |
| `exact`, 1 234 m | "1,2 km" |
| `rounded`, `under-1km` | "< 1 km" |
| `rounded`, `halfKm: 5` | "~2,5 km" |
| `unavailable` | "Distancia no disponible", con el motivo como texto secundario |
| marca `approximate` | sufijo " · aproximada" |
| marca `stale` | sufijo " · posición antigua" |

### `DistanceRadius` y disponibilidad

```ts
type DistanceRadius = 'under-1km' | 'under-3km' | 'all';     // "< 1 km", "< 3 km", "Todo Madrid"

type ExplorationAvailability =
  | { available: true }
  | { available: false; reason: UnavailableReason | 'far-from-madrid' };
```

- `all` es el valor por defecto (FR-017).
- Lejos de Madrid: más de 50 km (50 000 m) desde la Puerta del Sol (40.416775, -3.703790).
- Límites estrictos: 1 000 m exactos no entran en `under-1km`.

### `LocationPermissionEvent` (`src/core/analytics/events.ts`)

| Campo | Tipo |
|---|---|
| `name` | `'location_permission_result'` |
| `state` | `'granted' \| 'approximate' \| 'denied'` (`blocked` → `denied`) |
| `origin` | `'onboarding' \| 'contextual' \| 'profile'` |

Sin coordenadas, distancias ni identificadores de localización (FR-027, FR-028). Se emite
una vez por cada llamada a `request()`, con el estado resultante.

---

## 2. Persistencia

Sin tablas ni migraciones nuevas. Un único valor en la tabla `preferences` existente (spec
003, data-model §1), a través del puerto `PreferencesStore`:

| Clave | Valor | Escritura | Borrado |
|---|---|---|---|
| `location.last` | JSON `{"lat":40.41,"lng":-3.70,"accuracy":"precise","timestamp":1790000000000}` | en cada lectura aceptada | se escribe `""` al pasar a `denied` o `blocked` |

**Lectura**: se valida con un esquema `zod` del núcleo. Un valor vacío, que no es JSON o que
no valida, se trata como ausente: la app espera a una lectura en vivo (FR-026).
`accuracy` se guarda para no presentar como precisa una posición que se tomó con permiso
aproximado.

**Degradación**: la de `PreferencesStore`: un fallo de lectura devuelve `null`, uno de
escritura se registra y se descarta, sin excepción (FR-026).

El radio elegido **no se persiste** (supuesto de la spec): vive en el estado de exploración
de la pantalla del mapa, junto a `text`, `tagId` y `onlySaved`.

---

## 3. Estado de exploración del mapa (ampliación)

El estado `MapExploration` de la spec 003 (data-model §2) gana un campo:

| Campo | Tipo | Por defecto |
|---|---|---|
| `radius` | `DistanceRadius` | `'all'` |

**Composición (FR-018)**: la lista de marcadores es la intersección de
`queryLocations({ text, tagId })`, `onlySaved` y `withinRadius(visibleDistance(…),
effectiveRadius(radius, availability))`.

**Radio efectivo**: `effectiveRadius(radius, availability)` es `radius` si la exploración
está disponible y `'all'` si no. El radio elegido se conserva, así que vuelve a aplicarse al
volver dentro del umbral de Madrid.

**Revocación**: si `permission` pasa de `granted`/`approximate` a cualquier otro estado, la
pantalla pone `radius = 'all'`.

---

## 4. Transiciones del rastreador

Cualquier estado puede pasar a cualquier otro vía `resume()`, porque la persona puede cambiar
el permiso en Ajustes. Desde la app, solo `request()` cambia el permiso.

| Evento | Efecto |
|---|---|
| arranque | lee permiso y servicios; si `granted`/`approximate`, carga `location.last` como `cache` y arranca el seguimiento |
| `request(origin)` | pide permiso, emite `LocationPermissionEvent`, aplica el nuevo estado |
| paso a `granted`/`approximate` | arranca el seguimiento |
| paso a `denied`/`blocked`/`undetermined` | para el seguimiento, `position = null`, borra `location.last` |
| lectura del sistema | se acepta si `movedEnough`; actualiza `position` (`live`), escribe `location.last` |
| `suspend()` (segundo plano) | para el seguimiento; conserva `position` |
| `resume()` (primer plano) | relee permiso y servicios, aplica cambios y rearranca el seguimiento si procede |
| servicios apagados | `servicesEnabled = false`; se conserva la última posición si la había |

Un `request()` en estado `blocked` no llama al sistema: devuelve el estado sin cambios y no
emite evento. La UI nunca lo hace (research.md D-010), pero el rastreador se protege igual.
