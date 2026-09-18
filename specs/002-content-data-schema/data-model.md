# Data Model: Catálogo de contenido de la guía

**Feature**: 002-content-data-schema | **Fecha**: 2026-09-18

Modelo de las entidades de [spec.md](./spec.md), con sus campos, reglas de validación y
relaciones. El contrato serializado está en [contracts/catalog-schema.md](./contracts/catalog-schema.md);
aquí se describe el significado y las reglas.

## Vista general

```text
Catalog
├── schemaVersion, updatedAt, locales
├── access.premiumFields[]        ← la frontera de la compra, declarada una vez
├── tags[]                        ← vocabulario de etiquetas
├── tipCategories[]               ← vocabulario de categorías de consejo
├── neighbourhoods[]              ← barrios, con descripción propia
├── locations[]                   ← localizaciones fotográficas
│     └── referencia a tags[] y neighbourhoods[]
└── tips[]                        ← consejos generales, siempre gratuitos
      └── referencia a tipCategories[] y locations[]
```

Convenciones comunes a todas las entidades:

- **Identificadores**: cadena en `kebab-case`, de 2 a 40 caracteres, estable de por vida. No
  se traduce y no cambia aunque cambien los textos (FR-004). Único dentro de su colección.
- **Textos visibles**: objeto `LocalizedText` con `es` obligatorio y el resto de idiomas
  opcionales (FR-037).
- **Orden**: donde el orden importa, es el del array en el JSON. No hay campos `order`
  sueltos que puedan desincronizarse.
- **Campos desconocidos**: se ignoran en todas las entidades (FR-034).

---

## LocalizedText

Texto visible en una o varias lenguas.

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `es` | string | Sí | No vacío tras recortar espacios |
| `en` | string | No | Si está presente, no vacío |

**Resolución**: se pide un idioma y se devuelve esa variante; si falta, se devuelve `es`
(FR-038). Nunca se devuelve cadena vacía ni `undefined`.

---

## Catalog

Raíz del contenido.

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `schemaVersion` | entero ≥ 1 | Sí | Si es mayor que el soportado por la app, el catálogo no se carga (FR-036) |
| `updatedAt` | fecha ISO-8601 | Sí | Fecha válida |
| `locales` | string[] | Sí | Contiene al menos `"es"`; el primero es el idioma base |
| `access` | `AccessPolicy` | Sí | Ver abajo |
| `tags` | `Tag[]` | Sí | Al menos uno; ids únicos |
| `tipCategories` | `TipCategory[]` | Sí | Al menos una; ids únicos |
| `neighbourhoods` | `Neighbourhood[]` | Sí | Ids únicos |
| `locations` | `Location[]` | Sí | Ids únicos |
| `tips` | `Tip[]` | Sí | Ids únicos |

**Degradación**: un elemento inválido dentro de `locations` o `tips` se descarta
individualmente y se registra; el resto del catálogo sigue siendo utilizable (FR-035). Un
fallo en la raíz, en los vocabularios o en `access` invalida el catálogo entero, porque sin
ellos no se puede interpretar el resto.

---

## AccessPolicy

La frontera de la compra, declarada en datos y en un único sitio (FR-031).

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `premiumFields` | string[] | Sí | Nombres de campos de `Location` reservados a la compra |

**Reglas**:

- Debe incluir como mínimo `coords`, `capture`, `shotDescription`, `neighbourhoodDescription`
  y `detailImage` (FR-032).
- Todo nombre debe corresponder a un campo real de `Location`; uno desconocido es un error de
  validación.
- Un test comprueba que esta lista y la proyección implementada en el núcleo coinciden
  exactamente (D-006). La lista documenta; la proyección tipada es la que impide el error.

---

## Tag

Rasgo fotográfico de una localización. Una localización tiene varios (D-007).

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `id` | id | Sí | Único |
| `label` | LocalizedText | Sí | — |

Vocabulario inicial: `skyline`, `callejera`, `arquitectura`, `atardecer`, `nocturna`.

El orden del array es el orden de los chips de filtro. El filtro "todo" no es una etiqueta:
es la ausencia de filtro, y no se declara en datos.

---

## TipCategory

Agrupación temática de los consejos generales.

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `id` | id | Sí | Único |
| `label` | LocalizedText | Sí | — |

Vocabulario inicial: `ver`, `comer`, `dormir`, `transporte`.

Un consejo cuya categoría no exista se conserva y se agrupa bajo una categoría genérica de
respaldo, definida por la aplicación y no por el catálogo (FR-021, caso límite).

---

## Neighbourhood

Zona de Madrid. Existe como entidad propia porque su descripción se comparte entre las
localizaciones del mismo barrio (FR-009).

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `id` | id | Sí | Único |
| `name` | LocalizedText | Sí | — |
| `description` | LocalizedText | No | Qué ofrece la zona más allá de la foto |

**Acceso**: el *nombre* del barrio es público; su *descripción* es de pago, porque forma
parte de la ficha que se compra (`neighbourhoodDescription` en `premiumFields`).

---

## Location

Una localización fotográfica. Es la pieza que se compra.

### Campos públicos (visibles sin compra)

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `id` | id | Sí | Único |
| `name` | LocalizedText | Sí | — |
| `neighbourhoodId` | id | Sí | Debe existir en `neighbourhoods` |
| `tagIds` | id[] | Sí | Al menos uno recomendado; las desconocidas se conservan e ignoran al filtrar |
| `approximateArea` | `{ lat, lng, radiusMeters }` | Sí | `lat` ∈ [-90, 90], `lng` ∈ [-180, 180], `radiusMeters` ≥ 100 |
| `access` | `"free" \| "premium"` | Sí | Ausente o no reconocido ⇒ `premium` (FR-030) |
| `thumbnail` | `ImageRef` | Sí | Lo único visible sin compra (FR-025) |

### Campos reservados a la compra

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `coords` | `{ lat, lng }` | Sí | Punto exacto de disparo. Rango como arriba |
| `bestTime` | LocalizedText | No | Lenguaje natural ("45 min antes del atardecer") |
| `shotDescription` | LocalizedText | Sí | Cómo y desde dónde se consigue la foto |
| `capture` | `CaptureSettings` | No | Ver abajo |
| `detailImage` | `ImageRef` | Sí | Imagen a pantalla completa |
| `extraImages` | `ImageRef[]` | No | Imágenes adicionales (FR-014) |

`neighbourhoodDescription` no es un campo propio: se resuelve desde `neighbourhoodId` y queda
reservado a la compra igual que el resto de la ficha.

### Reglas transversales

- `approximateArea` **no** se deriva de `coords` al cargar: es un dato editorial propio, para
  que redondear el punto exacto no pueda filtrarlo nunca (caso límite de la spec).
- Coordenadas fuera de rango invalidan la localización; una localización sin
  `approximateArea` válida no se sitúa en el mapa para un usuario sin compra.
- La distancia al usuario **no se almacena**: se calcula (FR-016).
- Una localización `premium` sin `thumbnail` es un aviso de validación, no un error (FR-033).

---

## CaptureSettings

Parámetros con los que se tomó la fotografía de referencia. Cada uno es independiente y
opcional, porque la ficha los presenta como piezas sueltas (FR-012).

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| `camera` | string | `"Sony A7 IV"` |
| `focalLengthMm` | número > 0 | `24` |
| `aperture` | string | `"f/8"` |
| `shutterSpeed` | string | `"1/125 s"` |
| `iso` | entero > 0 | `100` |

Todos opcionales: una localización que solo declara focal e ISO muestra esos dos y nada más.
No se inventan valores ausentes ni se muestran huecos.

---

## ImageRef

Referencia a un JPG, por identificador y nunca por ruta (FR-023).

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `locationId` | id | Sí | La localización dueña del fichero |
| `usage` | `"thumb" \| "detail" \| "extra"` | Sí | Determina la ruta |
| `index` | entero ≥ 0 | Solo si `usage` = `extra` | Distingue imágenes adicionales |
| `alt` | LocalizedText | Sí | Texto alternativo |
| `aspectRatio` | número > 0 | No | Ancho / alto |
| `credit` | string | No | Autoría |

La resolución a un fichero concreto es responsabilidad del `ImageResolver`, fuera del núcleo.
La convención de rutas está en [contracts/image-store.md](./contracts/image-store.md).

---

## Tip

Consejo general sobre Madrid. Siempre gratuito: no lleva marca de acceso (FR-020).

| Campo | Tipo | Obligatorio | Reglas |
|-------|------|-------------|--------|
| `id` | id | Sí | Único |
| `categoryId` | id | Sí | Debería existir en `tipCategories`; si no, se agrupa bajo la categoría de respaldo |
| `title` | LocalizedText | Sí | — |
| `context` | LocalizedText | No | Línea breve: precio, horario o zona ("8 € · 92 m de altura") |
| `body` | LocalizedText[] | Sí | Uno o más párrafos, en orden |
| `relatedLocationIds` | id[] | No | Referencias rotas se ignoran al presentar y se avisan al validar (FR-019, FR-033) |

---

## Estados y transiciones

El catálogo no tiene máquina de estados: es contenido inmutable en tiempo de ejecución. Los
únicos estados relevantes son los del **resultado de la carga**:

| Estado | Cuándo | Qué recibe la aplicación |
|--------|--------|--------------------------|
| `ok` | El catálogo valida entero | Catálogo completo, sin avisos |
| `partial` | Validó, pero se descartaron piezas | Catálogo utilizable + lista de piezas descartadas y por qué |
| `unsupported-version` | `schemaVersion` mayor que el soportado | Nada. La app avisa y no interpreta los datos (FR-036) |
| `invalid` | JSON ilegible, o raíz/vocabularios/`access` inválidos | Nada. La app informa y no se cierra |

La proyección de acceso es una función pura sobre una localización ya cargada, no un estado:
dada una localización y si hay compra o no, devuelve `Location` o `LocationPreview`.
