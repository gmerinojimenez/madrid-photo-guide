# Feature Specification: Real Location Photos

**Feature Branch**: `004-real-location-photos`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Conectar las fotos reales de las localizaciones en la ficha de localización, las tarjetas de lista y el sheet de bloqueo, sustituyendo el bloque de color de relleno (`ImagePlaceholder`) por la imagen real resuelta mediante `imageRegistry.resolve()`, ya que los datos y ficheros de imagen están enlazados pero ninguna pantalla los pinta todavía (hueco documentado en specs/003-app-navigation-flows/research.md D-010)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la foto real en la ficha de localización (Priority: P1)

Un usuario con titularidad (o consultando una localización gratuita) abre la ficha de una localización desde el mapa, guardados o consejos relacionados, y ve la fotografía real del lugar en la cabecera en lugar de un bloque de color.

**Why this priority**: Es la pantalla donde el usuario decide si la foto merece la visita; un bloque de color de relleno no transmite ningún valor y es el hueco más visible de los tres.

**Independent Test**: Abrir la ficha de cualquier localización completa (`debod`, `castilla`, `torres`, `sol`, `mayor`) y comprobar que se muestra la fotografía `detail.jpg` correspondiente en vez de `ImagePlaceholder`.

**Acceptance Scenarios**:

1. **Given** una localización completa con imagen de detalle disponible en el almacén de assets, **When** el usuario abre su ficha, **Then** la cabecera muestra la fotografía real de esa localización.
2. **Given** una localización cuya imagen de detalle no puede resolverse (fichero ausente del registro), **When** el usuario abre su ficha, **Then** la cabecera recae en el bloque de color existente (`ImagePlaceholder`) en lugar de romper la pantalla o mostrar un hueco vacío.

---

### User Story 2 - Ver la miniatura real en las tarjetas de lista (Priority: P2)

Un usuario que navega resultados del mapa, su lista de guardados, o consejos relacionados ve la miniatura real de cada localización en su tarjeta, en lugar de un bloque de color repetido.

**Why this priority**: Las tarjetas de lista aparecen en varias pantallas y ayudan a reconocer visualmente la localización antes de entrar en la ficha; es de menor impacto que la ficha porque la decisión final ocurre allí, pero mejora la exploración.

**Independent Test**: Abrir la pestaña de guardados con al menos una localización guardada, o la pantalla de un consejo con localizaciones relacionadas, y comprobar que cada `ListCard` muestra la miniatura (`thumb.jpg`) real de su localización.

**Acceptance Scenarios**:

1. **Given** una localización (gratuita o de pago) con miniatura disponible en el almacén de assets, **When** aparece en una lista (guardados o consejos relacionados), **Then** su tarjeta muestra la miniatura real.
2. **Given** una localización cuya miniatura no puede resolverse, **When** aparece en una lista, **Then** su tarjeta recae en el bloque de color existente.

---

### User Story 3 - Ver la miniatura real en el sheet de bloqueo (Priority: P3)

Un usuario sin titularidad que toca una localización de pago en el mapa ve la miniatura real de esa localización en el panel de contenido bloqueado, como anticipo antes de decidir desbloquear.

**Why this priority**: Refuerza el incentivo de compra mostrando la foto real en vez de un bloque de color, pero el sheet ya comunica el valor mediante las filas de contenido bloqueado, por lo que es la prioridad más baja de las tres.

**Independent Test**: Tocar una localización de pago sin titularidad (por ejemplo `tiopio`) en el mapa y comprobar que el sheet de bloqueo muestra su miniatura real.

**Acceptance Scenarios**:

1. **Given** una localización de pago con miniatura disponible en el almacén de assets, **When** el usuario sin titularidad la toca en el mapa, **Then** el sheet de bloqueo muestra su miniatura real.
2. **Given** una localización de pago cuya miniatura no puede resolverse, **When** el usuario sin titularidad la toca, **Then** el sheet de bloqueo recae en el bloque de color existente.

### Edge Cases

- ¿Qué ocurre cuando `imageRegistry.resolve()` devuelve `null` (fichero no incluido en el registro o eliminado)? El bloque de color de relleno (`ImagePlaceholder`) debe seguir usándose como resultado visual en ese caso, en cualquiera de las tres pantallas.
- Las localizaciones de pago nunca llevan `detail.jpg` empaquetado (regla de la constitución para no filtrar contenido premium). La ficha de localización solo se alcanza para localizaciones completas (propiedad o gratuitas) según el enrutado existente, así que este caso no debería producirse en la práctica, pero el mecanismo de recaída al bloque de color lo cubre igualmente si sucediera.
- Una misma localización aparece simultáneamente en varias tarjetas de lista en pantalla (por ejemplo varios consejos relacionados repitiendo la misma localización): cada tarjeta debe resolver y mostrar su imagen de forma independiente sin error.
- Mientras la imagen real se decodifica o carga, la pantalla no debe quedar en blanco de forma brusca; debe mantenerse una transición visual coherente con el bloque de color previo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La ficha de localización (`app/location/[id].tsx`) MUST resolver y mostrar la imagen de detalle real de la localización mediante `imageRegistry.resolve()`, sustituyendo el uso incondicional de `ImagePlaceholder` en la cabecera.
- **FR-002**: Las tarjetas de lista (`ListCard`) MUST resolver y mostrar la miniatura real de la localización a la que representan, en todos los contextos donde se usan (guardados, consejos relacionados).
- **FR-003**: El sheet de contenido bloqueado (`LockedSheet`) MUST resolver y mostrar la miniatura real de la localización de pago que representa.
- **FR-004**: En cualquiera de las tres pantallas, si `imageRegistry.resolve()` devuelve `null` para la imagen solicitada, el sistema MUST mostrar `ImagePlaceholder` como recaída visual, sin lanzar error ni dejar un hueco vacío.
- **FR-005**: La sustitución MUST mantener las dimensiones, bordes redondeados y disposición visual ya definidos para cada bloque de imagen (cabecera de ficha, miniatura de tarjeta, imagen del sheet), de forma que el cambio sea solo de contenido (imagen real en vez de color) y no de maquetación.
- **FR-006**: El componente que sustituye a `ImagePlaceholder` MUST aceptar la referencia de imagen (`ImageRef` o los datos necesarios para construirla: id de localización y uso `thumbnail`/`detailImage`) como entrada, para que cada pantalla pueda pedir la imagen que le corresponde.
- **FR-007**: El sistema MUST seguir usando `imageRegistry` como única vía de resolución de imágenes (sin introducir un mecanismo de carga alternativo), preservando la separación entre el núcleo y la plataforma ya establecida en `src/core/content/images.ts`.

### Key Entities *(include if feature involves data)*

- **ImageRef**: Referencia existente (`locationId`, `usage` — `thumbnail`, `detailImage` o `extra` — e índice opcional) que identifica una imagen concreta de una localización; ya definida en el esquema de contenido y usada por `imageRegistry.resolve()`.
- **LocationImage (nuevo componente de UI)**: Componente de presentación que, dada una referencia de imagen, intenta resolverla vía `imageRegistry` y renderiza la fotografía real si existe, o `ImagePlaceholder` si no. Sustituye las llamadas directas a `ImagePlaceholder` en las tres pantallas afectadas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las localizaciones completas (con `detail.jpg` empaquetado) muestran su fotografía real en la ficha de localización, sin bloque de color, al abrir la pantalla.
- **SC-002**: El 100% de las localizaciones (gratuitas y de pago) con miniatura empaquetada muestran su fotografía real en las tarjetas de lista y en el sheet de bloqueo.
- **SC-003**: Ninguna pantalla afectada muestra un hueco en blanco, un fallo de renderizado o un cierre inesperado cuando una imagen no puede resolverse; en su lugar se ve el bloque de color existente.
- **SC-004**: El cambio no introduce diferencias de tamaño o posición apreciables en la cabecera de la ficha, las tarjetas de lista o el sheet de bloqueo respecto al diseño actual con `ImagePlaceholder`.

## Assumptions

- El almacén de assets (`assets/content/photos/<locationId>/thumb.jpg` y `detail.jpg`) y las entradas de `src/platform/images/registry.ts` ya contienen las imágenes necesarias para las localizaciones existentes (confirmado en la conversación previa: "los datos y los ficheros ya están bien enlazados"); esta funcionalidad no añade ni genera nuevas imágenes, solo las pinta.
- Las imágenes son estáticas y locales (empaquetadas con `require`), no se descargan de red; por tanto no se requiere gestión de estados de carga asíncrona compleja (spinners, reintentos), más allá de la recaída a `ImagePlaceholder` cuando `resolve()` devuelve `null`.
- El comportamiento de "mostrar bloques de color a propósito" documentado en `specs/003-app-navigation-flows/research.md` (D-010) se considera superado por esta funcionalidad: a partir de aquí, el bloque de color pasa a ser exclusivamente el mecanismo de recaída ante ausencia de imagen, no el comportamiento por defecto.
- No se requiere ampliar el esquema de contenido ni el registro de imágenes: se reutilizan `ImageRef`, `imageRegistry` y las localizaciones ya existentes en el catálogo.
