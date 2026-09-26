---

description: "Task list template for feature implementation"
---

# Tasks: Visualización completa de fotos (sin recorte)

**Input**: Design documents from `/specs/005-uncropped-photo-display/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: incluidos y obligatorios — el principio III de la constitución ("Testing por Feature,
NO NEGOCIABLE") exige tests unitarios y de aceptación en el mismo PR, y exige además que la
corrección de un bug (el recorte reportado) empiece por un test que lo reproduzca y falle.

**Organization**: las tareas se agrupan por historia de usuario (spec.md) para poder implementar
y probar cada una de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: US1 o US2, según `spec.md`
- Cada tarea incluye la ruta de fichero exacta

## Path Conventions

Proyecto único Expo/React Native: `app/` (rutas de `expo-router`), `src/` (núcleo y UI),
`__tests__/` (tests, en espejo de `src/`/`app/`) — según `plan.md`.

---

## Phase 1: Setup

**Purpose**: no hay inicialización de proyecto nueva (Expo/Jest/ESLint ya existen); el único
trabajo previo es documental, para que el contrato de navegación canónico quede correcto antes de
tocar código.

- [X] T001 Añadir la fila de `/photo-viewer` al contrato canónico de rutas en `specs/003-app-navigation-flows/contracts/routes.md`, copiando los datos de `specs/005-uncropped-photo-display/contracts/photo-viewer-route.md` (ruta, fichero, presentación `transparentModal`, parámetros, requisito)

**Checkpoint**: no bloquea nada de código; puede hacerse en paralelo con el resto de fases.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: la función pura de encaje de imagen y el componente que la usa
(`FittedPhoto`) los necesitan tanto la cabecera de ficha (US2) como el visor a pantalla completa
(US1). Nada de las tareas que montan `FittedPhoto` puede completarse sin esto.

**⚠️ CRITICAL**: ninguna tarea que dependa de `imageLayout.ts`/`FittedPhoto.tsx` puede empezar
hasta cerrar esta fase (T009 y T018 de más abajo).

> **Nota tras inspeccionar el contenido real** (ver `research.md` §2, revisado): `ImageRef` ya
> declara `aspectRatio` en el esquema y el catálogo actual lo rellena al 100% (57/57
> localizaciones). Esto hace innecesario leer la imagen en tiempo de ejecución
> (`Image.resolveAssetSource`) y, con ello, la interfaz `ImageSizeReader` planeada originalmente:
> se usa directamente `imageRef.aspectRatio` (con una proporción de reserva 4:3 si faltara).

- [X] T002 Escribir el test unitario, en fallo primero, de la función de encaje en `__tests__/components/image-layout.test.ts`: casos horizontal 4:3 (proporción del catálogo actual, ver `research.md` §2), vertical 3:4, proporción extrema (muy panorámica) y proporción que ya encaja exactamente — cada caso comprueba que el resultado conserva la proporción original y nunca excede el espacio disponible
- [X] T003 Implementar `computeContainedLayout` en `src/ui/components/imageLayout.ts` (función pura: dado un tamaño intrínseco `{width, height}` y un espacio máximo disponible `{maxWidth, maxHeight?}`, devuelve el tamaño de render que muestra la imagen completa sin recortar ni deformar) hasta que T002 pase (depende de T002)
- [X] T003c Crear `src/ui/components/FittedPhoto.tsx`: dado un `imageRef`, resuelve la imagen (`resolver` inyectable, por defecto `imageRegistry`), toma `imageRef.aspectRatio` (o una proporción de reserva 4:3 si falta), calcula `computeContainedLayout` (T003) contra un `{maxWidth, maxHeight?}` recibido por prop, y renderiza la imagen a ese tamaño con `resizeMode="contain"`; si no resuelve, renderiza `ImagePlaceholder` (depende de T003)

**Checkpoint**: `imageLayout.ts` y `FittedPhoto` listos y probados — US1 y US2 pueden empezar.

---

## Phase 3: User Story 1 - Ver la foto completa a pantalla completa al tocarla (Priority: P1) 🎯 MVP

**Goal**: tocar la foto de cabecera de una ficha, o la miniatura de una tarjeta de listado de
contenido desbloqueado, abre esa foto en una vista a pantalla completa, íntegra y sin recortar;
cerrarla vuelve exactamente a la pantalla de origen. La vista previa de contenido bloqueado nunca
ofrece este atajo (FR-009).

**Independent Test**: desde la ficha de un lugar gratuito, tocar la foto de cabecera abre el
visor con la imagen completa; cerrarlo vuelve a la ficha. Desde una tarjeta de listado (guardados
o localizaciones relacionadas de un consejo), tocar la miniatura abre el visor; tocar el resto de
la fila sigue navegando a la ficha. Tocar la miniatura del panel de contenido bloqueado no abre
nada.

### Tests for User Story 1 ⚠️

> Escribir estos tests primero y comprobar que fallan antes de implementar (principio III).

- [X] T004 [P] [US1] Escribir el test de aceptación, en fallo primero, de la ruta nueva en `__tests__/screens/photo-viewer.test.tsx`: navegar a `/photo-viewer` con `locationId`/`usage`/`index` válidos muestra la imagen resuelta completa; con un `locationId` o `usage` inválido muestra el estado de "contenido no disponible" (nunca en blanco ni un crash, FR-008); cerrar (control de cierre) hace `router.back()` y vuelve al estado de origen (contrato `photo-viewer-route.md`)
- [X] T005 [P] [US1] Añadir a `__tests__/screens/location-detail.test.tsx` el escenario: tocar la foto de cabecera navega a `/photo-viewer` con el `ImageRef` de `full.detailImage`
- [X] T006 [P] [US1] Añadir a `__tests__/screens/tip-detail.test.tsx` el escenario: para una localización relacionada **desbloqueada**, tocar la miniatura de su `ListCard` navega a `/photo-viewer`; para una localización relacionada **bloqueada**, tocar la miniatura no navega a ningún visor (sigue abriendo, como hoy, el panel de contenido bloqueado al tocar el resto de la fila)
- [X] T007 [P] [US1] Añadir a `__tests__/screens/saved.test.tsx` el escenario: tocar la miniatura de cualquier tarjeta de la lista de guardados navega a `/photo-viewer` (toda la lista es contenido ya desbloqueado)

### Implementation for User Story 1

- [X] T008 [US1] Registrar la pantalla nueva en `app/_layout.tsx`: `Stack.Screen` con `name="photo-viewer"` y `options={{ presentation: 'transparentModal' }}`, junto a la entrada existente de `paywall`
- [X] T009 [US1] Crear `app/photo-viewer.tsx`: leer `locationId`/`usage`/`index` de los parámetros de ruta, reconstruir el `ImageRef` (buscando la localización en `useCatalog()` para el `alt`), y pintarlo con `FittedPhoto` (T003c/T003) usando `useWindowDimensions()` como espacio disponible, sobre fondo negro; si el `locationId`/`usage` no son válidos (localización inexistente, o `ImageRef` que no resuelve), mostrar el mismo estado de "contenido no disponible" que usa `/location/[id]` con un identificador inexistente; cerrar con un control visible que llama a `router.back()` (depende de T003, T003c, T008; hace pasar T004)
- [X] T010 [US1] Añadir a `ListCard` (`src/ui/components/ListCard.tsx`) un prop opcional `onImagePress`: si se pasa, envuelve la miniatura en un `Pressable` anidado dentro del `Pressable` de fila existente, con `accessibilityLabel` distinta ("Ver foto completa de {title}"); si no se pasa, el comportamiento no cambia
- [X] T011 [US1] En `app/tip/[id].tsx`, pasar `onImagePress` a cada `ListCard` de localización relacionada **solo** cuando el `viewLocation(...)` ya calculado para esa fila devuelva una `Location` completa (no una `LocationPreview`), navegando a `/photo-viewer` con `locationId` y `usage: 'thumb'` (depende de T010; hace pasar la mitad "desbloqueada" de T006)
- [X] T012 [US1] En `app/(tabs)/saved.tsx`, pasar `onImagePress` a cada `ListCard` sin condición (la lista solo existe con `entitlement.owned`), navegando a `/photo-viewer` con `locationId` y `usage: 'thumb'` (depende de T010; hace pasar T007)
- [X] T013 [US1] En `app/location/[id].tsx`, envolver `<LocationImage imageRef={full.detailImage} .../>` en un `Pressable` que navegue a `/photo-viewer` con `locationId: full.id`, `usage: 'detail'`, con `accessibilityLabel` propia ("Ver foto completa") (hace pasar T005)

**Checkpoint**: la Historia de Usuario 1 es completa y probable de forma independiente (MVP).

---

## Phase 4: User Story 2 - Las fotos se muestran enteras en su contexto habitual (Priority: P2)

**Goal**: sin necesidad de tocar nada, la miniatura de listado, la cabecera de ficha y la vista
previa del panel de bloqueo muestran la fotografía completa, sin recortar ningún borde ni
deformarla, con relleno neutro donde la proporción no encaje exactamente.

**Independent Test**: revisar visualmente el listado de lugares, varias fichas de detalle y el
panel de contenido bloqueado con el catálogo actual (4:3) y con una foto de prueba vertical:
ninguna pierde contenido por recorte y ninguna se ve deformada.

### Tests for User Story 2 ⚠️

> Escribir estos tests primero y comprobar que fallan antes de implementar (principio III).

- [X] T014 [P] [US2] Extender `__tests__/components/location-image.test.tsx`: con un resolver que encuentra la imagen, el `<Image>` renderizado tiene `resizeMode="contain"` (no el `cover` por defecto)
- [X] T015 [P] [US2] Añadir a `__tests__/screens/location-detail.test.tsx` el escenario: el contenedor de la foto de cabecera se dimensiona según la proporción real de la imagen resuelta (vía `FittedPhoto`/`computeContainedLayout`), no con la altura fija anterior (usando el `aspectRatio` real del `ImageRef` del catálogo de prueba)
- [X] T016 [P] [US2] Añadir a `__tests__/screens/locked-sheet.test.tsx` el escenario: la miniatura de vista previa usa `resizeMode="contain"` dentro de su caja de altura fija, y confirmar (si no existe ya) que tocarla no dispara ninguna navegación

### Implementation for User Story 2

- [X] T017 [US2] En `src/ui/components/LocationImage.tsx`, fijar `resizeMode="contain"` en el `<Image>` (depende de T014)
- [X] T018 [US2] En `app/location/[id].tsx`, sustituir `<LocationImage imageRef={full.detailImage} style={styles.image}/>` (con su `height: 200` fija) por `<FittedPhoto imageRef={full.detailImage} maxWidth={...ancho de pantalla...} />` (T003c), dejando que el contenedor se dimensione según la proporción real de la foto en vez de recortarla (depende de T003c, T015)
- [X] T019 [US2] En `src/ui/components/ListCard.tsx`, mantener la caja fija de `styles.thumb` (56×56, sin cambio de tamaño) y añadir un color de fondo neutro (`colors.surface` o equivalente) detrás de la imagen, para que el relleno de `resizeMode="contain"` (T017) se lea como intencionado y no como un hueco vacío (depende de T017)
- [X] T020 [US2] En `src/ui/sheets/LockedSheet.tsx`, mantener la caja fija de `styles.image` (altura 140, sin cambio de tamaño) y añadir el mismo fondo neutro detrás de la imagen (depende de T017; hace pasar T016)

**Checkpoint**: ambas historias de usuario son ahora funcionales de forma independiente.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: validación manual de paridad de plataformas y de los edge cases que no se cubren
con tests unitarios/de aceptación (rotación de dispositivo, revisión visual del catálogo real).

- [ ] T021 Ejecutar los escenarios de `specs/005-uncropped-photo-display/quickstart.md` en un simulador iOS y en un emulador/dispositivo Android, confirmando paridad de comportamiento (principio V)
- [ ] T022 Revisión visual manual del catálogo completo de fotos actuales (mapa, guardados, fichas) confirmando ausencia de recorte de contenido relevante (SC-004)
- [ ] T023 [P] Verificar manualmente el edge case de rotación: abrir `/photo-viewer`, girar el dispositivo/simulador, confirmar que la foto sigue completa y sin recortar en la nueva orientación

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias; T001 es documental y no bloquea código
- **Foundational (Phase 2)**: sin dependencias de Setup; **bloquea** T009 (US1) y T018 (US2), las dos únicas tareas que usan `FittedPhoto`/`imageLayout.ts`/`ImageSizeReader`
- **User Story 1 (Phase 3)**: depende de Foundational (T003, T003c) para T009; el resto de tareas de US1 (T004, T005, T006, T007, T008, T010, T011, T012, T013) no dependen de la Fase 2 y pueden avanzar en paralelo con ella
- **User Story 2 (Phase 4)**: depende de Foundational (T003c) para T018; el resto no depende de US1
- **Polish (Phase 5)**: depende de tener completas las historias que se quieran validar (como mínimo US1, idealmente también US2)

### User Story Dependencies

- **US1 (P1)**: independiente de US2; es el MVP
- **US2 (P2)**: independiente de US1; puede implementarse antes, después o en paralelo — no hay tarea de una historia que dependa de una tarea de la otra

### Dentro de cada historia

- Tests primero (T004–T007 antes que T008–T013; T014–T016 antes que T017–T020), y deben fallar antes de implementar (principio III)
- `ListCard` (T010) antes de conectarlo en las pantallas que lo usan (T011, T012)
- `LocationImage` con `contain` (T017) antes de los ajustes de contenedor que dependen de ese cambio (T018, T019, T020)

### Parallel Opportunities

- T001 puede hacerse en cualquier momento, en paralelo con todo lo demás
- Dentro de Foundational: T003 depende de T002; T003c depende de T003
- Dentro de US1: T004, T005, T006, T007 en paralelo entre sí (ficheros de test distintos)
- Dentro de US2: T014, T015, T016 en paralelo entre sí (ficheros de test distintos)
- US1 y US2 pueden trabajarse en paralelo por personas distintas una vez cerrada la Fase 2
- T023 (Polish) puede hacerse en paralelo con T021/T022

---

## Parallel Example: User Story 1

```bash
# Lanzar juntos los tests de la Historia 1:
Task: "Test de aceptación de /photo-viewer en __tests__/screens/photo-viewer.test.tsx"
Task: "Escenario de cabecera en __tests__/screens/location-detail.test.tsx"
Task: "Escenario de ListCard en __tests__/screens/tip-detail.test.tsx"
Task: "Escenario de ListCard en __tests__/screens/saved.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Completar Fase 1 (Setup) — no bloqueante, puede diferirse
2. Completar Fase 2 (Foundational) — crítica, bloquea T009 y T018
3. Completar Fase 3 (US1)
4. **Parar y validar**: correr `npm test` y los escenarios 1–3 de `quickstart.md`
5. Esto ya resuelve el bug crítico reportado: cualquier foto tiene una vía garantizada de verse completa

### Incremental Delivery

1. Setup + Foundational listos
2. US1 → validar de forma independiente → esto es ya el MVP que corrige el bug crítico
3. US2 → validar de forma independiente → mejora la experiencia "en contexto", sin romper US1
4. Polish → validación manual de plataformas y catálogo completo

---

## Notes

- [P] = ficheros distintos, sin dependencias pendientes entre sí
- [US1]/[US2] mapean cada tarea a su historia de usuario para trazabilidad
- Los tests se escriben y deben fallar antes de implementar (principio III, NO NEGOCIABLE)
- Confirmar tras cada tarea que `npm test` sigue en verde para lo ya implementado
- Evitar: tareas vagas, dos tareas tocando el mismo fichero en paralelo, dependencias cruzadas entre US1 y US2 que rompan su independencia
