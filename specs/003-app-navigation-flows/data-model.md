# Data Model: Navegación y pantallas de la app

**Feature**: 003-app-navigation-flows

Esta feature **no cambia el esquema del catálogo**: lo amplía con contenido y añade dos
almacenes locales nuevos. Las entidades de contenido (`Location`, `Tip`, `Neighbourhood`,
`Tag`, `TipCategory`, `LocationPreview`) están definidas en
[la feature 002](../002-content-data-schema/data-model.md) y se consumen tal cual.

---

## 1. Estado local persistido (SQLite)

Base de datos `madrid-photo-guide.db`, abierta desde el layout raíz. Versión de esquema
gestionada con `PRAGMA user_version`; esta feature introduce la **versión 1**.

### Tabla `saved_locations`

Localizaciones que la persona usuaria ha marcado para su próxima salida (FR-025).

| Columna | Tipo | Restricciones | Significado |
|---------|------|---------------|-------------|
| `location_id` | `TEXT` | `PRIMARY KEY` | Identificador de la localización en el catálogo |
| `saved_at` | `INTEGER` | `NOT NULL` | Momento del marcado, en milisegundos epoch |

```sql
CREATE TABLE IF NOT EXISTS saved_locations (
  location_id TEXT PRIMARY KEY NOT NULL,
  saved_at    INTEGER NOT NULL
);
```

**Reglas**:

- `location_id` es clave primaria, así que guardar dos veces la misma localización es
  idempotente por construcción.
- **No hay clave foránea hacia el catálogo**, porque el catálogo no vive en SQLite sino en el
  JSON empaquetado. La integridad se resuelve al leer: los identificadores que ya no existen
  en el catálogo se descartan en memoria al componer la lista (caso límite de la spec), sin
  borrarlos de la tabla — si el contenido vuelve en una actualización posterior, el guardado
  sigue ahí.
- `saved_at` fija el orden de la lista de guardados: más reciente primero.
- La tabla **no distingue titularidad**: guardar está reservado a quien tiene la compra
  (FR-027), y esa comprobación se hace antes de escribir, no en el esquema.

### Tabla `preferences`

Almacén clave-valor para las marcas de la app (FR-026).

| Columna | Tipo | Restricciones | Significado |
|---------|------|---------------|-------------|
| `key` | `TEXT` | `PRIMARY KEY` | Nombre de la preferencia |
| `value` | `TEXT` | `NOT NULL` | Valor serializado |

```sql
CREATE TABLE IF NOT EXISTS preferences (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
```

**Claves definidas en esta feature**:

| Clave | Valores | Por defecto si falta | Significado |
|-------|---------|---------------------|-------------|
| `onboarding.completed` | `"1"` | ausente = no completada | La presentación inicial ya se recorrió |

Un valor distinto de `"1"` se trata como no completada. Es deliberado: ante un dato ilegible
se prefiere mostrar la presentación de más a saltársela por error.

### Migraciones

```text
user_version 0  →  1   crea saved_locations y preferences
```

El `onInit` del proveedor lee `user_version`, aplica en orden los tramos que falten y fija la
versión nueva. Versiones futuras solo añaden tramos; nunca se reescribe el tramo 0 → 1.

### Degradación (FR-028)

Si abrir la base de datos, aplicar las migraciones o leer falla, el adaptador **no propaga la
excepción**: registra el fallo por la interfaz de log del núcleo y responde con los valores
por defecto seguros —presentación no vista, lista de guardados vacía—. Las escrituras que
fallen se registran y se descartan; la app sigue siendo usable en modo sin persistencia.

---

## 2. Estado en memoria

Entidades que existen solo mientras la app está abierta.

### `Entitlement`

Reutiliza el tipo que ya define `src/core/content/access.ts`, sin declarar uno nuevo:

```ts
type Entitlement = { owned: boolean };
```

**Transiciones en esta entrega**:

```text
{ owned: false }  ──(botón "Comprar" del paywall)──▶  { owned: true }
      ▲                                                      │
      └──────────────(reinicio de la app)────────────────────┘
```

No persiste (D-006), así que cada arranque vuelve a "sin la compra". Es el comportamiento
esperado de la maqueta, no un defecto: lo contrario exigiría una migración cuando llegue la
tienda.

Todo consumidor obtiene la titularidad por suscripción, de modo que un cambio repinta a la vez
marcadores, barra de modo prueba, guardados, perfil y fichas (FR-031).

### `MapExploration`

El estado de exploración del mapa, que vive en la pantalla de mapa y sobrevive a abrir y
cerrar una ficha (FR-002, US1 §3):

```ts
type MapExploration = {
  text: string;          // texto del buscador ("" = sin filtrar)
  tagId: string | null;  // etiqueta de tipo seleccionada (null = "Todo")
  onlySaved: boolean;    // conmutador del panel de filtros
};
```

**Composición (FR-019)**: el conjunto visible es la intersección de los tres criterios. `text`
y `tagId` se delegan en `queryLocations` del núcleo, que ya normaliza mayúsculas y acentos;
`onlySaved` se aplica después, intersecando con la lista de guardados.

`onlySaved` solo puede activarse con la compra hecha: sin ella la lista de guardados está
siempre vacía y el filtro dejaría el mapa en blanco sin explicación.

### `SheetState`

Qué panel está superpuesto sobre la pantalla activa (FR-004). Los paneles son excluyentes
entre sí:

```ts
type SheetState =
  | { kind: 'none' }
  | { kind: 'locked'; locationId: string }   // contenido bloqueado
  | { kind: 'nav'; locationId: string }      // navegar hasta la foto
  | { kind: 'filters' }                      // filtros del mapa
  | { kind: 'purchased' };                   // compra completada
```

No forma parte del historial de navegación: cerrar un panel devuelve a `{ kind: 'none' }` sin
navegar.

### `OnboardingStep`

`0 | 1 | 2`, estado local de la ruta de presentación (D-002). Avanzar desde el paso 2 fija
`onboarding.completed` y navega al mapa o al paywall según la acción elegida (US3 §4 y §5):
**en ambos casos la marca se escribe**, también al saltar al paywall.

---

## 3. Recuentos derivados (FR-012)

Selector puro sobre el catálogo cargado, en `src/core/content/counts.ts`:

```ts
type CatalogCounts = { total: number; free: number; premium: number };
function catalogCounts(catalog: Catalog): CatalogCounts;
```

`free` cuenta las localizaciones con `access === 'free'`; `premium`, el resto. Como el esquema
ya normaliza toda marca ausente o ilegible a `premium`, no hay tercera categoría posible y
`free + premium === total` siempre.

**Consumidores**: barra de modo prueba del mapa, línea de plan del perfil, titular y precio
del paywall, y tercer paso de la presentación. Ninguno escribe una cifra literal.

Con el catálogo de esta entrega: `{ total: 14, free: 5, premium: 9 }`.

---

## 4. Ampliación del catálogo (FR-008)

### Localizaciones nuevas

Nueve localizaciones con `access: "premium"` y ficha completa. **Las coordenadas son las
reales de cada sitio** —el mapa es geográfico y los marcadores tienen que caer donde deben—;
las descripciones, los parámetros de captura y los mejores momentos son de maqueta, igual que
en las cinco existentes.

| `id` | Nombre | Barrio | Etiquetas | Coordenadas aproximadas |
|------|--------|--------|-----------|------------------------|
| `tiopio` | Cerro del Tío Pío | `vallecas` | `atardecer`, `skyline` | 40.3936, −3.6606 |
| `circulo` | Círculo de Bellas Artes | `centro` | `skyline`, `atardecer` | 40.4184, −3.6968 |
| `metropolis` | Edificio Metrópolis | `centro` | `arquitectura`, `nocturna` | 40.4180, −3.6981 |
| `matadero` | Matadero Madrid | `arganzuela` | `arquitectura` | 40.3919, −3.6976 |
| `faro` | Faro de Moncloa | `moncloa` | `skyline` | 40.4378, −3.7196 |
| `toledo` | Puente de Toledo | `arganzuela` | `nocturna`, `arquitectura` | 40.3969, −3.7139 |
| `retiro` | Palacio de Cristal | `retiro` | `arquitectura` | 40.4137, −3.6825 |
| `campo` | Casa de Campo | `latina` | `skyline`, `atardecer` | 40.4190, −3.7360 |
| `lavapies` | Calle de Lavapiés | `lavapies` | `callejera` | 40.4090, −3.7010 |

Las coordenadas de la tabla son el punto de partida; se verifican al implementar contra el
lugar concreto de disparo (por ejemplo, el mirador del cerro, no el borde del parque).

`approximateArea` se declara desplazada respecto de `coords` y con un radio de 300–500 m: es
lo único que ve quien no ha comprado (FR-010), así que **no puede coincidir con el punto
exacto**, o la zona aproximada revelaría lo que oculta.

**Colisión de identificadores a vigilar**: el prototipo usa `faro` tanto para la localización
Faro de Moncloa como para el consejo "Sube al Faro de Moncloa al atardecer", que ya existe en
el catálogo con ese `id`. Los consejos y las localizaciones son colecciones distintas y el
validador comprueba unicidad **dentro** de cada una, así que no hay conflicto; conviene saberlo
para no "corregir" un duplicado que no lo es.

### Barrios nuevos

Seis, cada uno con nombre y descripción (la descripción es campo reservado a la compra):
`vallecas`, `arganzuela`, `moncloa`, `retiro`, `latina` y `lavapies`. `centro` ya existe y lo
reutilizan `circulo` y `metropolis`; `lavapies` estrena barrio propio, como en el prototipo,
en lugar de colgar de `centro`.

### Etiquetas

**Ninguna nueva.** Los cinco tipos del prototipo ya existen: `skyline`, `callejera`,
`arquitectura`, `atardecer`, `nocturna`.

### Imágenes

Cada localización nueva declara `thumbnail` y `detailImage`, que el esquema exige y el
validador comprueba contra el disco. Por tanto:

- **18 JPG de marcador nuevos** en `assets/content/photos/<id>/{thumb,detail}.jpg`, generados
  con `scripts/generate-placeholder-photos.py`.
- **18 entradas nuevas** en `src/platform/images/registry.ts`.

Se generan aunque ninguna pantalla de esta entrega los muestre —FR-022 pide bloques de color—
porque `npm run validate:catalog` es puerta de CI y falla si un fichero declarado no existe.

### Invariantes que la ampliación debe preservar

1. `npm run validate:catalog` termina sin errores ni advertencias de recurso huérfano.
2. Los identificadores de localización siguen siendo únicos entre sí.
3. Toda localización premium tiene poblados los campos de `access.premiumFields`: `coords`,
   `capture`, `shotDescription`, `detailImage` y la descripción de su barrio. Una premium sin
   ellos no tendría nada que desbloquear.
4. Las cinco localizaciones gratuitas no cambian: su contenido ya está probado por la feature
   002 y tocarlo rompería tests ajenos a esta feature.
