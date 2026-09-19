# Contract: API de núcleo añadida por esta feature

**Feature**: 003-app-navigation-flows

Módulos nuevos del núcleo. Todos son **TypeScript puro**: no importan `react`,
`react-native` ni `expo-*`, y se ejercitan en Node sin simulador.

La API de contenido existente (`loadCatalog`, `queryLocations`, `tipsByCategory`,
`viewLocation`, `isFullLocation`, `localize`) se consume sin cambios; su contrato está en
[la feature 002](../../002-content-data-schema/contracts/core-api.md).

---

## `src/core/entitlement`

### `EntitlementSource`

```ts
import type { Entitlement } from '../content/access.ts';   // { owned: boolean }

export interface EntitlementSource {
  /** Titularidad vigente. Nunca lanza: ante duda, el estado conocido. */
  current(): Entitlement;

  /** Notifica cada cambio. Devuelve la función para dejar de escuchar. */
  subscribe(listener: (entitlement: Entitlement) => void): () => void;
}
```

Es la interfaz que implementará RevenueCat en la feature de pagos. Se define ahora para que
esa sustitución no toque ninguna pantalla.

**Contrato**:

- `current()` es síncrona y no lanza. Un origen que aún no sabe responde con el último estado
  conocido, nunca con una excepción ni con `undefined` (degradación segura del principio VI).
- `subscribe` no emite el estado inicial: quien se suscribe ya ha leído `current()`.
- La función devuelta por `subscribe` es idempotente: llamarla dos veces no falla.

### `InMemoryEntitlementSource`

Implementación de esta entrega (D-006).

```ts
export class InMemoryEntitlementSource implements EntitlementSource {
  constructor(initial?: Entitlement);   // por defecto { owned: false }
  current(): Entitlement;
  subscribe(listener: (e: Entitlement) => void): () => void;
  /** Concede la titularidad y notifica. Lo llama el botón "Comprar" (FR-030). */
  grant(): void;
}
```

**Contrato**:

- Arranca en `{ owned: false }` salvo que el constructor diga otra cosa — el parámetro existe
  para que los tests monten directamente el estado "con la compra".
- `grant()` es idempotente: llamarla estando ya concedida no vuelve a notificar.
- **No persiste nada**: un reinicio devuelve a `{ owned: false }` (FR-029).
- No hay `revoke()`. Revocar no es un comportamiento del producto —la compra no caduca nunca—
  y ofrecerlo invitaría a usarlo.

---

## `src/core/navigation/links.ts`

Construcción pura de los enlaces de navegación externa (D-007). Este módulo **no abre nada**:
devuelve cadenas.

```ts
import type { LatLng } from '../content/schema.ts';

/** "40.42400, -3.71766" — seis decimales, punto decimal, coma y espacio. */
export function formatCoordinates(coords: LatLng): string;

/** URL universal de Google Maps apuntando al punto. */
export function googleMapsUrl(coords: LatLng, label?: string): string;

/** URL universal de Apple Maps apuntando al punto. */
export function appleMapsUrl(coords: LatLng, label?: string): string;
```

**Contrato**:

- Las tres funciones son puras y deterministas: mismas coordenadas, misma cadena.
- El formato numérico es **invariable respecto del idioma**: punto decimal siempre, aunque la
  interfaz esté en español y el sistema use coma. Una URL con coma decimal no resuelve.
- Se usan URL `https://` universales, no esquemas de app: no dependen de que la app esté
  instalada ni obligan a declarar esquemas consultables en iOS.
- `label` es el nombre de la localización, opcional y ya escapado por la función. Sirve para
  que la ficha del mapa muestre "Templo de Debod" en lugar de unas coordenadas desnudas.
- El texto que produce `formatCoordinates` es a la vez **el que se muestra en la ficha y el que
  se copia al portapapeles** (US6 §3): son el mismo valor, no dos formatos parecidos.

---

## `src/core/content/counts.ts`

```ts
import type { Catalog } from './schema.ts';

export type CatalogCounts = { total: number; free: number; premium: number };

export function catalogCounts(catalog: Catalog): CatalogCounts;
```

**Contrato** (FR-012):

- `free` cuenta `access === 'free'`; `premium` es el resto. Como el esquema normaliza toda
  marca ausente o ilegible a `premium`, se cumple siempre `free + premium === total`.
- Función pura sobre el catálogo que recibe: no lee estado global ni cachea.
- Es la **única** fuente de los recuentos que se muestran al usuario. Ninguna pantalla escribe
  una cifra literal de localizaciones.

---

## `src/core/storage`

Puertos de persistencia. El núcleo define la forma; el adaptador de `expo-sqlite` vive en
`src/platform/storage/` y los tests usan el doble en memoria (D-005).

### `SavedLocationsStore`

```ts
export interface SavedLocationsStore {
  /** Identificadores guardados, del más reciente al más antiguo. */
  list(): Promise<string[]>;
  save(locationId: string): Promise<void>;
  remove(locationId: string): Promise<void>;
  has(locationId: string): Promise<boolean>;
}
```

**Contrato**:

- `save` es idempotente: guardar dos veces no duplica ni cambia el orden original.
- `remove` sobre algo no guardado no es un error.
- `list` devuelve identificadores **tal como se guardaron**, sin filtrar contra el catálogo:
  descartar los que ya no existen es tarea de quien compone la lista, y así un contenido que
  vuelve en una actualización recupera su guardado.
- **El puerto no comprueba titularidad.** La regla "guardar es de la guía completa" (FR-027)
  es de producto y vive en la capa que llama, no en el almacén; meterla aquí la duplicaría
  fuera del módulo de acceso.
- Ningún método lanza por fallo de almacenamiento: ver *Degradación*.

### `PreferencesStore`

```ts
export interface PreferencesStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}
```

**Contrato**:

- `get` devuelve `null` para una clave ausente **y también cuando el almacén falla**: quien
  llama no distingue, y no debe hacerlo.
- Las claves son las declaradas en [data-model.md](../data-model.md#tabla-preferences).

### Degradación (FR-028)

Regla común a los dos puertos, y parte del contrato, no del adaptador:

- Una lectura que falla devuelve el **valor por defecto seguro** —lista vacía, `null`, `false`—
  y registra el fallo por la interfaz `ContentLogger` que ya existe en el núcleo.
- Una escritura que falla se registra y se descarta en silencio.
- **Ningún método rechaza su promesa por fallo de almacenamiento.** Un almacén roto degrada la
  app a "sin persistencia", nunca la rompe.

Esta regla es la que hace comprobable el caso límite "el almacenamiento local no puede leerse
al arrancar" sin necesidad de un dispositivo con el disco lleno: basta un doble que falle.

### `InMemorySavedLocationsStore` / `InMemoryPreferencesStore`

Dobles que implementan los puertos con un `Map`, usados por los tests unitarios y de
aceptación. Aceptan opcionalmente un modo "siempre falla", para ejercitar la degradación.

Viven en el núcleo, no en los tests: son la referencia del contrato, y el adaptador de SQLite
se valida contra la misma batería de casos.
