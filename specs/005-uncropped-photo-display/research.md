# Research: Visualización completa de fotos (sin recorte)

**Feature**: 005-uncropped-photo-display | **Date**: 2026-09-24

Todas las incógnitas de la especificación se resuelven aquí antes de diseñar contratos y modelo.
No hay dependencias nuevas: todo se resuelve con APIs ya presentes en Expo / React Native y con
el patrón de navegación ya usado por `paywall`.

---

## 1. Mecanismo para la vista a pantalla completa

**Decision**: nueva pantalla de `expo-router`, `app/photo-viewer.tsx`, registrada en el `Stack`
raíz con `presentation: 'transparentModal'`. Se cierra con `router.back()`, igual que el resto
de pantallas apiladas.

**Rationale**: la constitución exige una única solución de navegación basada en rutas
declarativas (sección "Restricciones Tecnológicas y de Plataforma"). `paywall` ya usa
`presentation: 'modal'` para una pantalla que cubre el flujo actual; reutilizar el mismo
mecanismo para la foto (con la variante transparente, para un fondo negro de visor de fotos en
vez de una tarjeta) evita introducir un segundo sistema de superposición.

**Alternatives considered**: un componente `<Modal>` de React Native montado localmente en cada
pantalla que muestra fotos (ficha, tarjetas). Rechazado: duplicaría el visor en varios sitios y
competiría con la navegación declarativa ya establecida, en contra de la restricción de "una
única solución de navegación".

---

## 2. Cómo conocer la proporción real de cada foto sin parpadeo ni red

**Decision**: `Image.resolveAssetSource(source).width` / `.height` de React Native, que para
imágenes empaquetadas con `require(...)` (todo el catálogo actual, ver
`src/platform/images/registry.ts`) devuelve la resolución original de forma **síncrona**, sin
esperar a que la imagen cargue. Con esas dimensiones se calcula la proporción real y se usa para
dimensionar el contenedor (estilo `aspectRatio`) y para decidir el relleno neutro cuando no
encaja exactamente.

**Rationale**: al ser assets estáticos resueltos por Metro en tiempo de compilación, el
empaquetador ya conoce el ancho y alto reales; no hace falta cargar la imagen para saberlo, así
que no hay parpadeo de "caja equivocada mientras carga" ni estado de carga adicional que
gestionar solo para esto.

**Alternatives considered**: `Image.getSize()` (API asíncrona pensada para URIs remotas; obligaría
a un estado de carga y podría mostrar brevemente una caja con la proporción por defecto antes de
corregirse); fijar una única proporción constante en el código (rechazado: funciona hoy porque el
catálogo es uniformemente 4:3 — comprobado en los ficheros de `assets/content/photos/**`, p. ej.
`1600×1200`, `400×300` — pero rompe el requisito explícito de admitir verticales futuras sin
tocar código, SC-003).

**Corrección tras inspeccionar el contenido real**: `ImageRef` ya declara un campo
`aspectRatio` opcional en el esquema (`src/core/content/schema.ts`), y **el catálogo actual lo
rellena al 100%** (57 de 57 localizaciones, tanto en `thumbnail` como en `detailImage`, todas en
`1.3333` = 4:3). Eso hace innecesario leer la imagen en tiempo de ejecución: la proporción ya
viaja en el dato. Se usa `imageRef.aspectRatio` directamente como entrada de
`computeContainedLayout` (con un valor de reserva 4:3 solo para el caso, hoy inexistente, de un
`ImageRef` sin `aspectRatio`). Esto también resuelve mejor el soporte a verticales futuras que la
alternativa de `Image.resolveAssetSource`: basta con que el contenido declare su proporción real
al añadir la foto, sin ninguna lectura de plataforma ni problema de testabilidad (el transformador
de assets de Jest sustituye cada `require('foto.jpg')` por `{ testUri: 'ruta' }`, sin `width`ni
`height`, lo que sí hubiera obligado a inyectar un lector de tamaño falso en cada test — innecesario
una vez se usa el dato ya existente).

---

## 3. Dónde se aplica la regla "sin pantalla completa para contenido bloqueado" (FR-009)

**Decision**: no se añade ninguna comprobación de titularidad nueva dentro de
`app/photo-viewer.tsx`. En su lugar, el atajo para abrir la foto ("tocar para ver completa") solo
se conecta en los puntos de llamada que ya saben que están mostrando contenido desbloqueado:

- La cabecera de `app/location/[id].tsx`: solo se renderiza tras `viewLocation(...)` haber
  devuelto una `Location` completa (contrato R-3 de `specs/003-app-navigation-flows`), nunca para
  una `LocationPreview`.
- El prop nuevo `onImagePress` de `ListCard`: en `app/tip/[id].tsx`, que mezcla localizaciones
  bloqueadas y desbloqueadas, se pasa **solo** cuando el mismo `viewLocation(...)` ya calculado
  para decidir el `onPress` de la tarjeta devuelve una `Location` completa. En
  `app/(tabs)/saved.tsx` se pasa siempre, porque esa lista solo existe con la compra hecha
  (`entitlement.owned`) y solo contiene localizaciones ya desbloqueadas.
- `LockedSheet` no recibe `onImagePress`: su miniatura de vista previa deja de recortarse (FR-006)
  pero sigue sin ser tocable, tal como se acordó en la clarificación de la spec.

**Rationale**: el principio VI de la constitución prohíbe que una pantalla replique por su cuenta
la decisión de acceso; `viewLocation` es el único punto que decide qué es una `Location` completa
y qué es una `LocationPreview`. Añadir una segunda comprobación dentro del visor duplicaría esa
decisión en un segundo módulo.

**Alternatives considered**: comprobar la titularidad dentro de `photo-viewer.tsx` antes de
resolver la imagen (rechazado: viola el principio VI). Confiar únicamente en que hoy las
localizaciones de pago nunca empaquetan una imagen `detail` (cierto, y se mantiene como red de
seguridad adicional a nivel de datos) — no es la defensa principal, porque no cubre una miniatura
bloqueada a la que alguien conectara el atajo por error.

---

## 4. Foto dentro de una tarjeta que ya es tocable por completo (`ListCard`)

**Decision**: la miniatura de `ListCard` gana su propio `Pressable` interno (`onImagePress`,
opcional) anidado dentro del `Pressable` de fila que ya existe. El sistema de gestos de React
Native resuelve la anidación de forma estándar: el control interno responde dentro de sus propios
límites; el resto de la fila sigue abriendo la localización. Se añade una
`accessibilityLabel` explícita en la miniatura ("Ver foto completa de {título}") para que un
lector de pantalla la distinga de la acción de abrir la localización.

**Rationale**: FR-001 y el escenario 1 de la Historia de Usuario 2 sitúan explícitamente las
tarjetas de listado dentro del alcance de "ver la foto completa"; anidar un `Pressable` dentro de
otro es un patrón estándar y ya usado en RN, no experimental.

**Alternatives considered**: dejar el atajo a pantalla completa solo en la cabecera de ficha y
excluir las tarjetas (más simple, evita la anidación) — descartado porque contradice
explícitamente FR-001 y el escenario de aceptación correspondiente de la spec.

---

## 5. Cómo mostrar la foto completa "en contexto" sin romper el diseño de listas (Historia 2)

**Decision**:
- Se sustituye el `resizeMode` implícito (`cover`, el valor por defecto de `<Image>`, que
  recorta) por `resizeMode="contain"` en todos los usos de `LocationImage`.
- La miniatura de `ListCard` (56×56) y la vista previa de `LockedSheet` (altura fija) **no
  necesitan ningún cálculo de proporción propio**: `resizeMode="contain"` dentro de una caja de
  tamaño fijo ya hace exactamente lo que pide FR-006 de forma nativa (encaja la imagen entera,
  preservando su proporción, dejando hueco en los lados que sobren). Lo único que añaden estos dos
  sitios es un color de fondo neutro detrás de la imagen, para que ese hueco se lea como relleno
  intencionado y no como un vacío. El ritmo visual de la lista no cambia: la caja sigue siendo
  56×56 en todas las filas.
- La cabecera de la ficha de detalle es el caso distinto: al ser un único elemento sin filas
  vecinas con las que alinearse, en vez de vivir dentro de una caja de altura fija (que
  `resizeMode="contain"` seguiría dejando con relleno arriba/abajo en el caso 4:3 habitual), su
  **contenedor** pasa a dimensionarse según la proporción real de la foto (decisión #2, vía
  `ImageSizeReader` + la función pura `computeContainedLayout`), con un ancho máximo igual al de
  la pantalla. Así el caso mayoritario (4:3) no deja ningún hueco, y un caso futuro de proporción
  extrema sí puede acabar limitado por una altura máxima razonable con relleno neutro. El visor a
  pantalla completa (`/photo-viewer`, decisión #1) usa el mismo mecanismo: ancho/alto disponibles
  = dimensiones de pantalla (`useWindowDimensions()`), en vez del ancho de una cabecera de ficha.
- Para evitar duplicar "resolver + leer tamaño + calcular encaje + fallback a placeholder" en dos
  sitios (cabecera de ficha y visor), esa lógica se agrupa en un componente compartido,
  `FittedPhoto` (ver `data-model.md` y `plan.md`).

**Rationale**: una lista con filas de altura variable por foto sería más difícil de escanear
(rompe el ritmo vertical), mientras que la foto principal de la ficha no tiene esa restricción y
puede ocupar el espacio que le corresponda según su proporción real. Esto resuelve el bug
reportado (recorte) en todos los sitios sin necesidad de rediseñar el listado, y sin más cálculo
manual de proporciones que el estrictamente necesario (las cajas de tamaño fijo ya lo resuelven
solas con la propiedad nativa `contain`).

**Alternatives considered**: hacer que la altura de cada fila de `ListCard` varíe según la
proporción de su foto (rechazado para las listas: rompe la alineación y la previsibilidad del
listado, que es justamente lo que hace una lista fácil de escanear).

---

## Resumen de dependencias

Ninguna decisión anterior requiere una dependencia nueva. Se usan exclusivamente:
`expo-router` (ya presente, nueva pantalla y entrada de `Stack`), y las APIs de `Image` de
React Native (`resolveAssetSource`, `resizeMode`) ya usadas por `LocationImage`.
