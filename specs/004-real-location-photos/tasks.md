---

description: "Task list for feature implementation"
---

# Tasks: Real Location Photos

**Input**: Design documents from `/specs/004-real-location-photos/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/location-image.md](./contracts/location-image.md), [quickstart.md](./quickstart.md)

**Tests**: **obligatorios, no opcionales.** El principio III de la constitución es NO
NEGOCIABLE: ninguna feature se considera completa sin sus tests de aceptación, en el mismo PR.
Por eso la fase Foundational y cada fase de historia incluyen sus tests antes de darse por
cerradas.

**Organization**: las tareas se agrupan por historia de usuario para que cada una pueda
implementarse, probarse y entregarse por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: a qué historia pertenece (US1, US2, US3)
- Cada tarea lleva su ruta de fichero exacta

## Path Conventions

Proyecto móvil Expo, sin cambio de estructura respecto a las features 001-003:

- `app/` — rutas de Expo Router (**nunca tests aquí**)
- `src/core/` — dominio en TypeScript puro (sin cambios en esta feature)
- `src/platform/` — adaptadores de módulos nativos (sin cambios en esta feature)
- `src/ui/` — componentes React compartidos por las rutas
- `__tests__/` — todos los tests

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: no hay dependencias nuevas que instalar (research.md R-001) ni configuración
nueva. Esta fase se reduce a confirmar que el punto de partida está limpio.

- [X] T001 Confirmar en local que `npm run verify` pasa en la base de la rama antes de tocar nada (tipos, lint, `validate:catalog`, tests), para tener una línea base limpia contra la que comparar

**Checkpoint**: línea base verde confirmada. No hay nada más que instalar o configurar.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el componente `LocationImage` (contracts/location-image.md) es la única pieza que
las tres historias comparten — sin él ninguna pantalla tiene qué usar.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta que esta fase esté completa.

- [X] T002 Crear `src/ui/components/LocationImage.tsx`: prop `imageRef: ImageRef` (de `../../core/content/schema.ts`), prop opcional `resolver: ImageResolver` con valor por defecto `imageRegistry` (de `../../platform/images/registry.ts`), prop opcional `style`; si `resolver.resolve(ref)` no es `null`, renderiza `Image` de `react-native` con ese `source` y el `style` reenviado; si es `null`, renderiza `<ImagePlaceholder style={style} />` (mismo componente ya existente en `./ImagePlaceholder.tsx`) — contrato completo en contracts/location-image.md
- [X] T003 [P] Escribir `__tests__/components/location-image.test.tsx` con React Native Testing Library: caso "con un resolver que devuelve una fuente no nula, se renderiza `Image` con esa fuente" (usar un resolver falso in-memory que no dependa de assets reales) y caso "con un resolver que devuelve `null`, se renderiza `ImagePlaceholder`" (FR-004, research.md R-004)
- [X] T004 Ejecutar `npm test -- __tests__/components/location-image.test.tsx` y confirmar que ambos casos pasan antes de continuar

**Checkpoint**: `LocationImage` existe, está probado de forma aislada, y las tres historias pueden empezar a usarlo.

---

## Phase 3: User Story 1 - Ver la foto real en la ficha de localización (Priority: P1) 🎯 MVP

**Goal**: al abrir la ficha de cualquier localización completa, la cabecera muestra su
fotografía real en vez de `ImagePlaceholder`.

**Independent Test**: abrir la ficha del Templo de Debod (localización gratuita con
`detail.jpg` empaquetado) y comprobar que la cabecera muestra esa fotografía; recae en
`ImagePlaceholder` solo si `imageRegistry.resolve()` no encuentra la imagen (ejercitado por el
test de `LocationImage` de la Fase 2, no aquí — ver research.md R-004).

### Tests for User Story 1

> **NOTE**: se añade el caso a un test de aceptación ya existente, no un fichero nuevo — sigue
> renderizando la app completa con `renderRouter`, como ya hacen los tests de esta pantalla.

- [X] T005 [US1] Añadir a `__tests__/screens/location-detail.test.tsx` un caso que abre la ficha del Templo de Debod y comprueba que la fotografía real de `assets/content/photos/debod/detail.jpg` es la que se muestra en la cabecera (no `ImagePlaceholder`) — verificar mediante la fuente/`testID` que exponga `LocationImage`/`Image`, consistente con cómo el resto de tests de esta pantalla interactúan por accesibilidad

### Implementation for User Story 1

- [X] T006 [US1] En `app/location/[id].tsx`, sustituir `<ImagePlaceholder style={styles.image} />` por `<LocationImage imageRef={full.detailImage} style={styles.image} />`, importando `LocationImage` desde `../../src/ui/components/LocationImage.tsx` en vez de (o además de) `ImagePlaceholder` según si el import sigue haciendo falta
- [X] T007 [US1] Ejecutar `npm test -- __tests__/screens/location-detail.test.tsx` y confirmar que el caso nuevo de T005 pasa y que los casos existentes de la pantalla no se rompen

**Checkpoint**: User Story 1 funciona de punta a punta y es demostrable por sí sola — la ficha de localización ya no muestra bloques de color para localizaciones con imagen empaquetada.

---

## Phase 4: User Story 2 - Ver la miniatura real en las tarjetas de lista (Priority: P2)

**Goal**: las tarjetas de `ListCard` (en Guardados y en Localizaciones relacionadas de un
consejo) muestran la miniatura real de cada localización.

**Independent Test**: guardar el Templo de Debod y abrir Guardados: su tarjeta muestra
`thumb.jpg` real. Abrir un consejo con localizaciones relacionadas: cada tarjeta relacionada
muestra su miniatura real.

### Tests for User Story 2

- [X] T008 [P] [US2] Añadir a `__tests__/screens/saved.test.tsx` un caso que guarda una localización con miniatura empaquetada (p. ej. Templo de Debod) y comprueba que su `ListCard` en la pestaña Guardados muestra la fotografía real en vez de `ImagePlaceholder`
- [X] T009 [P] [US2] Añadir a `__tests__/screens/tip-detail.test.tsx` un caso que abre un consejo con al menos una localización relacionada con miniatura empaquetada y comprueba que su `ListCard` muestra la fotografía real en vez de `ImagePlaceholder`

### Implementation for User Story 2

- [X] T010 [US2] En `src/ui/components/ListCard.tsx`, añadir la prop opcional `image?: ImageRef` (tipo importado de `../../core/content/schema.ts`) a `Props`; cuando `image` está presente, renderizar `<LocationImage imageRef={image} style={styles.thumb} />` en el lugar donde hoy va `<ImagePlaceholder style={styles.thumb} />`; cuando `image` es `undefined`, mantener exactamente el comportamiento actual (`ImagePlaceholder` incondicional) — contrato en contracts/location-image.md
- [X] T011 [P] [US2] En `app/(tabs)/saved.tsx`, pasar `image={item.thumbnail}` a `<ListCard>` dentro de `renderItem`
- [X] T012 [P] [US2] En `app/tip/[id].tsx`, pasar `image={location.thumbnail}` a `<ListCard>` dentro del `.map()` de `related`
- [X] T013 [US2] Ejecutar `npm test -- __tests__/screens/saved.test.tsx __tests__/screens/tip-detail.test.tsx` y confirmar que los casos nuevos de T008/T009 pasan y que los casos existentes no se rompen

**Checkpoint**: User Stories 1 y 2 funcionan juntas e independientemente — la ficha y las listas ya muestran fotos reales.

---

## Phase 5: User Story 3 - Ver la miniatura real en el sheet de bloqueo (Priority: P3)

**Goal**: el sheet de contenido bloqueado (`LockedSheet`) muestra la miniatura real de la
localización de pago que representa.

**Independent Test**: sin titularidad, tocar una localización de pago (p. ej. Templo del Tío
Pío) en el mapa y comprobar que el sheet de bloqueo muestra su miniatura real.

### Tests for User Story 3

- [X] T014 [US3] Añadir a `__tests__/screens/locked-sheet.test.tsx` un caso que, sin titularidad, toca una localización de pago con miniatura empaquetada en el mapa y comprueba que el sheet de bloqueo muestra la fotografía real en vez de `ImagePlaceholder`

### Implementation for User Story 3

- [X] T015 [US3] En `src/ui/sheets/LockedSheet.tsx`, sustituir `<ImagePlaceholder style={styles.image} />` por `<LocationImage imageRef={preview.thumbnail} style={styles.image} />`, importando `LocationImage` desde `../components/LocationImage.tsx`
- [X] T016 [US3] Ejecutar `npm test -- __tests__/screens/locked-sheet.test.tsx` y confirmar que el caso nuevo de T014 pasa y que los casos existentes de la pantalla no se rompen

**Checkpoint**: las tres historias funcionan juntas e independientemente — ninguna de las tres pantallas del hueco original (D-010) muestra ya un bloque de color por defecto.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: cerrar la feature con la puerta de calidad completa del proyecto.

- [X] T017 Ejecutar `npm run verify` (tipos, lint, `validate:catalog`, suite completa de tests) y confirmar que todo pasa en verde
- [ ] T018 Recorrer manualmente el quickstart.md (secciones US1/US2/US3) en un simulador o dispositivo, confirmando que las tres pantallas muestran fotos reales para localizaciones existentes del catálogo
- [X] T019 Revisar que ningún import de `ImagePlaceholder` quedó huérfano (sigue usándose como recaída dentro de `LocationImage`, y potencialmente ya no se importa directamente en `app/location/[id].tsx`, `ListCard.tsx` o `LockedSheet.tsx` si `LocationImage` es ahora el único punto de entrada) — limpiar imports no usados

**Checkpoint**: feature completa, verificable con `npm run verify`, lista para PR con commit `feat:` (comportamiento nuevo: las pantallas pintan fotos reales).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede arrancar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA las tres historias
- **User Stories (Phase 3-5)**: todas dependen de que Foundational esté completa
  - Pueden avanzar en paralelo (si hay más de una persona) o en orden de prioridad P1 → P2 → P3
  - No hay dependencias cruzadas entre historias: cada una toca una pantalla distinta y usa `LocationImage` de forma independiente
- **Polish (Phase 6)**: depende de que las historias que se quieran entregar estén completas

### User Story Dependencies

- **User Story 1 (P1)**: puede empezar tras Foundational (Phase 2) — sin dependencia de US2 ni US3
- **User Story 2 (P2)**: puede empezar tras Foundational (Phase 2) — sin dependencia de US1 ni US3
- **User Story 3 (P3)**: puede empezar tras Foundational (Phase 2) — sin dependencia de US1 ni US2

### Within Each User Story

- El test se escribe antes que el cambio de implementación (principio III) y debe fallar hasta que la tarea de implementación correspondiente se complete
- Dentro de US2, T011 y T012 son paralelizables entre sí (ficheros distintos) pero ambas dependen de T010 (la prop `image` tiene que existir en `ListCard` antes de que alguien se la pase)

### Parallel Opportunities

- T003 (test de `LocationImage`) puede escribirse en paralelo a T002 si se sigue TDD estricto (test primero, en rojo, luego T002 lo pone en verde) — el orden aquí refleja secuencia de commit, no una dependencia de fichero
- T008 y T009 (tests de US2, ficheros distintos) son paralelizables entre sí
- T011 y T012 (dos pantallas distintas) son paralelizables entre sí una vez completada T010
- Una vez cerrada la Fase 2, las Fases 3, 4 y 5 completas pueden repartirse entre varias personas sin bloquearse mutuamente

---

## Parallel Example: User Story 2

```bash
# Tests de US2 en paralelo (ficheros distintos):
Task: "Añadir caso de miniatura real a __tests__/screens/saved.test.tsx"
Task: "Añadir caso de miniatura real a __tests__/screens/tip-detail.test.tsx"

# Tras T010 (prop `image` en ListCard), los dos llamadores en paralelo:
Task: "Pasar image={item.thumbnail} en app/(tabs)/saved.tsx"
Task: "Pasar image={location.thumbnail} en app/tip/[id].tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea las tres historias)
3. Completar Phase 3: User Story 1
4. **PARAR y VALIDAR**: probar la ficha de localización de forma independiente (T007 + sección US1 de quickstart.md)
5. Esto ya es un incremento entregable: la pantalla de mayor impacto (donde el usuario decide si la foto merece la visita) deja de mostrar un bloque de color

### Incremental Delivery

1. Setup + Foundational → `LocationImage` listo y probado
2. Añadir US1 → probar independientemente → la ficha ya muestra fotos reales (MVP)
3. Añadir US2 → probar independientemente → Guardados y Localizaciones relacionadas ya muestran miniaturas reales
4. Añadir US3 → probar independientemente → el sheet de bloqueo ya muestra su miniatura real
5. Cada historia añade valor sin romper las anteriores — las tres son independientes entre sí, solo comparten `LocationImage`

### Parallel Team Strategy

Con más de una persona:

1. El equipo completa Setup + Foundational junto (Fase 2 es corta: un componente y su test)
2. Con Foundational cerrada:
   - Persona A: User Story 1 (Fase 3)
   - Persona B: User Story 2 (Fase 4)
   - Persona C: User Story 3 (Fase 5)
3. Las tres historias se integran sin conflicto: tocan ficheros distintos (`app/location/[id].tsx` vs. `ListCard.tsx`+`saved.tsx`+`tip/[id].tsx` vs. `LockedSheet.tsx`)

---

## Notes

- [P] tasks = ficheros distintos, sin dependencias pendientes entre ellas
- [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Verificar que los tests fallan antes de implementar (T003 antes de T002 completado, T005 antes de T006, T008/T009 antes de T010-T012, T014 antes de T015)
- Commit por tarea o por grupo lógico, con el tipo `feat:` (comportamiento nuevo) según la convención del proyecto
- Parar en cualquier checkpoint para validar una historia de forma independiente
- Evitar: tareas vagas, conflictos de mismo fichero dentro de un `[P]`, dependencias cruzadas entre historias que rompan su independencia
