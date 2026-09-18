---
description: "Task list for feature 002: catálogo de contenido de la guía y almacén de imágenes"
---

# Tasks: Catálogo de contenido de la guía y almacén de imágenes

**Input**: Design documents from `/specs/002-content-data-schema/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: obligatorios. El principio III de la constitución exige tests unitarios y de
aceptación en el mismo PR que el comportamiento. Su forma en esta feature (aceptación sobre
la API pública en lugar de renderizado) está justificada en D-010 y en Complexity Tracking.

**Organization**: agrupadas por historia de usuario, para poder implementarlas y probarlas de
forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US5)
- Toda tarea lleva ruta de fichero exacta

## Path Conventions

Estructura fijada en plan.md: `src/core/` es dominio TypeScript puro, `src/platform/` es todo
lo que toca Metro o React Native, `src/content/` es el catálogo, `assets/content/photos/` son
los JPG y `__tests__/` la suite (heredada de la feature 001).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependencias, estructura de directorios y comandos de verificación.

- [X] T001 Instalar la dependencia de validación con `npx expo install zod@4.6.5` y comprobar que queda anclada en `package.json` y en `package-lock.json`
- [X] T002 [P] Crear la estructura de directorios vacía `src/core/content/`, `src/content/`, `src/platform/images/`, `assets/content/photos/` y `__tests__/content/` con un `.gitkeep` donde haga falta
- [X] T003 [P] Añadir a `package.json` los scripts `validate:catalog` (ejecuta `scripts/validate-catalog.ts`) y `verify` (encadena `typecheck`, `lint`, `validate:catalog` y `test`)
- [X] T004 [P] Añadir el paso `npm run validate:catalog` al workflow `.github/workflows/ci.yml`, entre el lint y los tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: piezas que todas las historias usan. Ninguna historia puede empezar sin esto.

**⚠️ CRITICAL**: bloquea las fases 3 a 7.

- [X] T005 Definir los primitivos del esquema en `src/core/content/schema.ts`: `contentId` (kebab-case, 2–40 caracteres), `localizedText` (con `es` obligatorio y no vacío) y `latLng` con sus rangos, según data-model.md
- [X] T006 [P] Implementar `localize(text, locale)` en `src/core/content/localize.ts`, con caída al español y garantía de no devolver nunca cadena vacía (FR-038)
- [X] T007 [P] Definir la interfaz de registro de incidencias en `src/core/content/logging.ts` (`ContentLogger` y el tipo `DiscardedPiece` con colección, id y motivo), sin usar `console` en el dominio
- [X] T008 Crear la superficie pública `src/core/content/index.ts` reexportando lo que fija [contracts/core-api.md](./contracts/core-api.md), y dejarla al día conforme avancen las fases
- [X] T009 [P] Añadir a `eslint.config.js` una regla `no-restricted-imports` que prohíba importar `react`, `react-native` y `expo*` dentro de `src/core/**`, para que el principio I lo verifique el linter y no la revisión humana
- [X] T010 [P] Escribir los tests de los primitivos y de la localización de textos en `__tests__/content/localize.test.ts`: idioma pedido presente, idioma pedido ausente con caída al español, y texto base ausente como error de validación

**Checkpoint**: el núcleo arranca, corre en Node y el linter protege su pureza.

---

## Phase 3: User Story 1 - Catálogo único de contenido (Priority: P1) 🎯 MVP

**Goal**: declarar todo el contenido de la guía en un `catalog.json` versionado, cargarlo y
validarlo con degradación elegante, y sembrarlo con 5 localizaciones de maqueta.

**Independent Test**: añadir una sexta localización editando solo `src/content/catalog.json` y
comprobar que aparece en las consultas sin tocar nada de `src/core/`.

### Tests for User Story 1

> Escribir estos tests antes de la implementación y verlos fallar.

- [X] T011 [P] [US1] Tests del esquema y de la degradación en `__tests__/content/schema.test.ts`: campos desconocidos ignorados (FR-034), localización inválida descartada en solitario conservando el resto (FR-035), `schemaVersion` futura no interpretada (FR-036), JSON ilegible devuelto como `invalid`, y referencia `neighbourhoodId` inexistente
- [X] T012 [P] [US1] Test de aceptación en `__tests__/content/catalog.acceptance.test.ts` que carga el `src/content/catalog.json` real y comprueba que las 5 localizaciones y los 5 consejos quedan disponibles, y que una consulta por identificador devuelve exactamente una pieza

### Implementation for User Story 1

- [X] T013 [US1] Ampliar `src/core/content/schema.ts` con las entidades de data-model.md: `Tag`, `TipCategory`, `Neighbourhood`, `CaptureSettings`, `Location`, `Tip`, `AccessPolicy` y `Catalog`, derivando los tipos con `z.infer`
- [X] T014 [US1] Implementar `loadCatalog(raw)` en `src/core/content/catalog.ts` con los cuatro resultados de data-model.md (`ok`, `partial`, `unsupported-version`, `invalid`), descartando pieza a pieza y reportando por `ContentLogger`. Nunca lanza, nunca hace E/S
- [X] T015 [US1] Declarar la constante `SUPPORTED_SCHEMA_VERSION = 1` y la resolución de referencias entre entidades (localización → barrio, localización → etiquetas) en `src/core/content/catalog.ts`
- [X] T016 [US1] Crear `src/content/catalog.json` con la cabecera (`schemaVersion`, `updatedAt`, `locales`), el bloque `access.premiumFields`, el vocabulario de 5 etiquetas y el de 4 categorías de consejo, según [contracts/catalog-schema.md](./contracts/catalog-schema.md)
- [X] T017 [US1] Añadir a `src/content/catalog.json` los barrios de la semilla (Argüelles, Plaza Castilla, Chamartín, Centro) con su descripción, tomados del contenido de maqueta de D-008
- [X] T018 [US1] Añadir a `src/content/catalog.json` las 5 localizaciones gratuitas de la semilla —Templo de Debod, Puerta de Europa, Cuatro Torres, Puerta del Sol y Plaza Mayor— con ficha completa: etiquetas múltiples, zona aproximada, coordenadas, mejor momento, descripción de la toma, parámetros de captura y referencias de imagen
- [X] T019 [US1] Escribir el validador base en `scripts/validate-catalog.ts`: identificadores duplicados, campos obligatorios, referencias entre entidades, coordenadas fuera de rango y campos de `premiumFields` inexistentes. Código de salida distinto de cero ante error, avisos sin bloquear
- [X] T020 [US1] Exportar desde `src/core/content/index.ts` la carga del catálogo y sus tipos

**Checkpoint**: el catálogo existe, carga, valida y degrada. US1 es demostrable sin imágenes.

---

## Phase 4: User Story 2 - Almacén y resolución de imágenes (Priority: P1)

**Goal**: una convención única de almacenamiento de los JPG, referenciados por identificador
y resueltos fuera del núcleo.

**Independent Test**: dejar un JPG siguiendo la convención, declararlo en el catálogo y
comprobar que se resuelve; borrarlo y comprobar que la validación lo detecta y que la
resolución degrada a `null` sin lanzar.

### Tests for User Story 2

- [X] T021 [P] [US2] Tests de resolución de imágenes en `__tests__/content/images.test.ts`: referencia declarada y presente que resuelve, referencia ausente del registro que devuelve `null` sin lanzar, y construcción de la clave de registro para los tres usos (`thumb`, `detail`, `extra-N`)
- [X] T022 [P] [US2] Ampliar `__tests__/content/catalog.acceptance.test.ts` para comprobar que las 10 imágenes de la semilla (5 miniaturas + 5 detalles) resuelven contra el registro real

### Implementation for User Story 2

- [X] T023 [US2] Definir `ImageRef`, `ImageSource` y la interfaz `ImageResolver` en `src/core/content/images.ts`, junto con la función pura que compone la clave `<locationId>/<usage>[-<index>]` de [contracts/image-store.md](./contracts/image-store.md). El núcleo no construye rutas de fichero
- [X] T024 [P] [US2] Escribir `scripts/generate-placeholder-photos.py`: genera PNG con la librería estándar de Python (`zlib` + `struct`) y los convierte a JPEG con `sips`, en 400 px (miniatura) y 1600 px (detalle), con el nombre de la localización visible (D-009)
- [X] T025 [US2] Ejecutar el script y versionar los 10 JPG resultantes bajo `assets/content/photos/{debod,castilla,torres,sol,mayor}/{thumb,detail}.jpg`
- [X] T026 [US2] Implementar el registro empaquetado en `src/platform/images/registry.ts` con los `require` estáticos de los 10 ficheros y la implementación de `ImageResolver` que devuelve `null` ante clave desconocida
- [X] T027 [US2] Ampliar `scripts/validate-catalog.ts` con las comprobaciones de imágenes: imagen declarada cuyo fichero no existe (error), fichero presente que nadie declara (aviso), y localización de pago sin miniatura (aviso)
- [X] T028 [US2] Añadir a `scripts/validate-catalog.ts` la comprobación constitucional de D-003: ninguna imagen `detail` o `extra` de una localización marcada como `premium` puede existir en `assets/content/photos/` (error)

**Checkpoint**: US1 + US2 entregan el catálogo con sus imágenes reales. Es el corte entregable.

---

## Phase 5: User Story 3 - Consejos generales por categoría (Priority: P2)

**Goal**: ofrecer los consejos agrupados por categoría, siempre gratuitos y con salto a las
localizaciones relacionadas.

**Independent Test**: declarar consejos en varias categorías y comprobar que se obtienen
agrupados y en orden, sin necesidad de que exista ninguna localización.

### Tests for User Story 3

- [X] T029 [P] [US3] Tests de consejos en `__tests__/content/tips.test.ts`: agrupación por categoría en el orden del catálogo, consejo con categoría desconocida conservado bajo la categoría de respaldo, y `relatedLocationIds` roto ignorado al presentar

### Implementation for User Story 3

- [X] T030 [US3] Implementar `tipsByCategory(catalog)` en `src/core/content/query.ts`, respetando el orden de `tipCategories` y agrupando bajo una categoría de respaldo los consejos huérfanos
- [X] T031 [US3] Añadir a `src/content/catalog.json` los 5 consejos de la semilla —Faro de Moncloa, Mercado de la Cebada, dónde dormir, abono de transporte y el Rastro— con categoría, línea de contexto, párrafos y localizaciones relacionadas (D-008)
- [X] T032 [US3] Ampliar `scripts/validate-catalog.ts` con los avisos de consejos: categoría fuera del vocabulario y `relatedLocationIds` que apunta a una localización inexistente
- [X] T033 [US3] Exportar `tipsByCategory` desde `src/core/content/index.ts`

**Checkpoint**: la sección de tips tiene contenido y API. US1–US3 funcionan de forma independiente.

---

## Phase 6: User Story 4 - Gratuito y de pago desde los datos (Priority: P2)

**Goal**: que la marca de acceso viva en el catálogo y que su interpretación esté en un único
módulo del núcleo.

**Independent Test**: clasificar contenido de prueba marcado como gratuito, como de pago y sin
marca legible, y comprobar que el resultado coincide con lo declarado y que la ausencia de
marca se trata como de pago.

### Tests for User Story 4

- [X] T034 [P] [US4] Tests de clasificación de acceso en `__tests__/content/access.test.ts`: localización `free`, localización `premium`, localización sin campo `access` y localización con valor no reconocido — las dos últimas clasificadas como de pago (FR-030)

### Implementation for User Story 4

- [X] T035 [US4] Implementar `accessOf(location)` en `src/core/content/access.ts`, único punto del proyecto que interpreta la marca, con `premium` como valor por defecto ante marca ausente o irreconocible
- [X] T036 [US4] Ajustar el esquema de `Location` en `src/core/content/schema.ts` para que un `access` ausente o desconocido no invalide la pieza, sino que se normalice a `premium` al cargar
- [X] T037 [US4] Exportar `accessOf` y el tipo `Entitlement` desde `src/core/content/index.ts`

**Checkpoint**: la regla de negocio de acceso está en datos y concentrada en un módulo.

---

## Phase 7: User Story 5 - Vista previa de las localizaciones de pago (Priority: P2)

**Goal**: proyectar cada localización según la titularidad, de modo que el compilador impida
exponer un campo de pago a quien no ha comprado.

**Independent Test**: pedir una localización de pago sin compra y comprobar, campo a campo,
que se obtiene exactamente la vista previa y ningún campo reservado; repetirlo con compra y
obtener la ficha completa.

### Tests for User Story 5

- [X] T038 [P] [US5] Tests de proyección en `__tests__/content/access.test.ts`: localización de pago sin compra devuelve la vista previa y ninguna clave reservada en runtime (SC-008), localización de pago con compra devuelve la ficha completa, y localización gratuita devuelve la ficha completa sin compra
- [X] T039 [P] [US5] Test de coherencia en `__tests__/content/access.test.ts` que compara `access.premiumFields` del catálogo real con la proyección implementada en el núcleo y falla si divergen (D-006)

### Implementation for User Story 5

- [X] T040 [US5] Definir el tipo `LocationPreview` en `src/core/content/access.ts` como tipo propio con menos campos, nunca como `Partial<Location>`, según [contracts/core-api.md](./contracts/core-api.md)
- [X] T041 [US5] Implementar `viewLocation(location, entitlement)` y el discriminador `isFullLocation(view)` en `src/core/content/access.ts`, como funciones puras
- [X] T042 [US5] Implementar la resolución de la descripción del barrio de forma que exija un `Location` completo y no sea alcanzable desde una `LocationPreview`, en `src/core/content/access.ts`
- [X] T043 [US5] Ampliar `scripts/validate-catalog.ts` para exigir que `access.premiumFields` contenga los campos mínimos de FR-032 y que todo nombre listado sea un campo real de `Location`
- [X] T044 [US5] Exportar `viewLocation`, `isFullLocation` y `LocationPreview` desde `src/core/content/index.ts`

**Checkpoint**: las cinco historias funcionan de forma independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T045 [P] Implementar la búsqueda y el filtrado en `src/core/content/query.ts`: `queryLocations(catalog, { text, tagId })`, con coincidencia por cualquiera de las etiquetas (FR-010b) y búsqueda insensible a mayúsculas y acentos sobre nombre, barrio y etiquetas
- [X] T046 [P] Tests de consulta en `__tests__/content/query.test.ts`: una localización con dos etiquetas aparece bajo el filtro de ambas, búsqueda de "arguelles" encuentra "Argüelles", y una etiqueta fuera del vocabulario no excluye la localización de las demás consultas
- [X] T047 [P] Documentar en `README.md` cómo añadir una localización y un consejo al catálogo, y dónde dejar los JPG, enlazando a [contracts/catalog-schema.md](./contracts/catalog-schema.md) y [contracts/image-store.md](./contracts/image-store.md)
- [X] T048 Comprobar el objetivo de rendimiento del plan midiendo `loadCatalog` sobre un catálogo sintético de 60 localizaciones en `__tests__/content/schema.test.ts` (presupuesto: 50 ms)
- [X] T049 Ejecutar de principio a fin [quickstart.md](./quickstart.md), incluida la comprobación manual de SC-001 (añadir una localización sin tocar `src/core/`) y la de que el núcleo no importa React Native
- [X] T050 Ejecutar `npm run verify` y dejar el pipeline en verde antes de abrir el PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias.
- **Foundational (Fase 2)**: depende de la Fase 1. **Bloquea todas las historias.**
- **US1 (Fase 3)**: depende de la Fase 2.
- **US2 (Fase 4)**: depende de la Fase 2. Su validación de imágenes (T027) necesita el
  validador base de T019.
- **US3 (Fase 5)**, **US4 (Fase 6)**, **US5 (Fase 7)**: dependen de la Fase 2 y del esquema de
  T013. US5 se prueba mejor con el catálogo sembrado de US1.
- **Polish (Fase 8)**: depende de las historias que se quieran entregar.

### Dependencias dentro del código

Tres ficheros concentran las dependencias y conviene tenerlo presente:

- `src/core/content/schema.ts` lo tocan T005, T013 y T036 — **no son paralelizables entre sí**.
- `scripts/validate-catalog.ts` lo tocan T019, T027, T028, T032 y T043 — secuenciales.
- `src/core/content/index.ts` lo tocan T008, T020, T033, T037 y T044 — secuenciales.
- `src/content/catalog.json` lo tocan T016, T017, T018 y T031 — secuenciales.

### Parallel Opportunities

- Fase 1: T002, T003 y T004 en paralelo tras T001.
- Fase 2: T006, T007, T009 y T010 en paralelo tras T005.
- Dentro de cada historia, los tests marcados [P] se escriben en paralelo antes de implementar.
- Con Fase 2 cerrada, US3, US4 y US5 pueden repartirse entre personas distintas, siempre que
  se coordinen en los cuatro ficheros compartidos de arriba.
- Fase 8: T045, T046 y T047 en paralelo.

---

## Parallel Example: User Story 1

```bash
# Los dos tests de US1, en paralelo, antes de implementar:
Task: "Tests del esquema y de la degradación en __tests__/content/schema.test.ts"
Task: "Test de aceptación del catálogo real en __tests__/content/catalog.acceptance.test.ts"
```

---

## Implementation Strategy

### MVP (US1 + US2)

A diferencia del caso habitual, el MVP de esta feature son **dos** historias: un catálogo sin
imágenes no es una guía fotográfica, y la convención de imágenes es justamente la decisión que
determina si el contenido podrá migrarse a origen remoto sin rehacerlo.

1. Fase 1: Setup
2. Fase 2: Foundational (bloquea todo)
3. Fase 3: US1 → catálogo, carga, degradación, semilla
4. Fase 4: US2 → almacén de JPG y resolución
5. **PARAR Y VALIDAR**: `npm run verify` y el paso 3 del quickstart
6. Entregable: el contenido de la guía existe y es editable sin tocar código

### Entrega incremental

1. Setup + Foundational → base lista
2. US1 + US2 → MVP, contenido navegable desde el núcleo
3. US3 → sección de consejos con contenido
4. US4 → marca de acceso interpretada en un único sitio
5. US5 → proyección de vista previa, la frontera de la compra cerrada en tipos
6. Polish → búsqueda, documentación, rendimiento y quickstart

US4 y US5 son inseparables en la práctica: US4 sin US5 clasifica pero no protege. Si hay que
partir el PR, que sea entre el MVP (US1+US2) y el resto, no entre US4 y US5.

---

## Notes

- Commits: solo `feat:` y `fix:`, como exige la constitución.
- Cada historia se cierra con sus tests en el mismo commit que el comportamiento; está
  prohibido fusionar con tests marcados como skip sin un issue enlazado.
- T028 no es una comprobación decorativa: es lo que impide incumplir la constitución por
  descuido el día que se añada la primera localización de pago con foto.
- Ninguna tarea toca `App.tsx` ni introduce pantallas. Esta feature no entrega UI.
