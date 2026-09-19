---

description: "Task list for feature implementation"
---

# Tasks: Navegación y pantallas de la app

**Input**: Design documents from `/specs/003-app-navigation-flows/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: **obligatorios, no opcionales.** El principio III de la constitución es NO
NEGOCIABLE: ninguna feature se considera completa sin tests unitarios de núcleo y tests de
aceptación que ejerciten el escenario de usuario, **en el mismo PR**. Además SC-007 de la spec
exige cobertura de las siete historias. Por eso cada fase de historia empieza por sus tests.

**Organization**: las tareas se agrupan por historia de usuario para que cada una pueda
implementarse, probarse y entregarse por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: a qué historia pertenece (US1…US7)
- Cada tarea lleva su ruta de fichero exacta

## Path Conventions

Proyecto móvil Expo con las tres capas que fija [plan.md](./plan.md):

- `app/` — rutas de Expo Router (**nunca tests aquí**)
- `src/core/` — dominio en TypeScript puro, sin React ni nativo
- `src/platform/` — adaptadores de módulos nativos
- `src/ui/` — componentes React compartidos por las rutas
- `__tests__/` — todos los tests

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dejar el proyecto con las dependencias, el punto de entrada y el tema listos para
que exista un árbol de rutas.

- [X] T001 Instalar las dependencias de la feature con `npx expo install expo-router expo-maps expo-sqlite expo-clipboard expo-constants expo-linking expo-splash-screen expo-system-ui react-native-screens react-native-gesture-handler`, y verificar que `package.json` queda con las versiones del SDK 57 de research.md
- [X] T002 Cambiar el punto de entrada a Expo Router en `package.json` (`"main": "expo-router/entry"`) y eliminar `index.ts` y `App.tsx`
- [X] T003 Configurar `app.json`: `"userInterfaceStyle": "dark"`, plugin de `expo-router`, plugin de `expo-maps` con la clave de API de Google Maps para Android, y `scheme` para enlaces profundos
- [X] T004 [P] Crear los tokens del tema "Nocturne" en `src/ui/theme/tokens.ts` con los valores de research.md D-008, traduciendo `--color-divider` de `color-mix()` a su `rgba` equivalente
- [X] T005 [P] Crear la tabla de equivalencias de iconos Phosphor → `@expo/vector-icons` en `src/ui/theme/icons.ts`
- [X] T006 Crear `jest.setup.ts` y registrarlo en la configuración de Jest de `package.json`, con los dobles de los módulos nativos: `expo-maps` (renderiza cada marcador como pulsable con su nombre accesible), `expo-sqlite`, `Linking.openURL` y `expo-clipboard`
- [X] T007 Eliminar `__tests__/App.test.tsx`, que prueba el `App.tsx` retirado en T002

**Checkpoint**: el proyecto compila, `npm run typecheck` y `npm run lint` pasan, y Jest arranca con los dobles cargados.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: catálogo ampliado, núcleo nuevo, persistencia y esqueleto de navegación. Todo lo
que cualquier historia necesita.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta que esta fase esté completa.

### Ampliación del catálogo (FR-008, D-010)

- [X] T008 Añadir las 9 localizaciones de pago y los 6 barrios nuevos a `src/content/catalog.json` según la tabla de data-model.md §4, con `access: "premium"`, coordenadas reales, contenido ficticio, y `approximateArea` desplazada respecto de `coords` con radio de 300–500 m
- [X] T009 Generar los 18 JPG de marcador en `assets/content/photos/<id>/{thumb,detail}.jpg` para las 9 localizaciones nuevas con `python3 scripts/generate-placeholder-photos.py`
- [X] T010 Añadir las 18 entradas `require` correspondientes a `src/platform/images/registry.ts`
- [X] T011 Verificar que `npm run validate:catalog` termina sin errores **ni advertencias de recurso huérfano**, y que los tests existentes de `__tests__/content/` siguen en verde sin modificarlos

### Núcleo nuevo (contracts/core-api.md)

- [X] T012 [P] Implementar `catalogCounts` en `src/core/content/counts.ts` y exportarlo desde `src/core/content/index.ts`
- [X] T013 [P] Escribir los tests unitarios de recuentos en `__tests__/core/counts.test.ts`, incluyendo el invariante `free + premium === total` y el catálogo sin premium
- [X] T014 [P] Implementar la interfaz `EntitlementSource` en `src/core/entitlement/source.ts` y `InMemoryEntitlementSource` en `src/core/entitlement/in-memory.ts`, con `index.ts` de exportación
- [X] T015 [P] Escribir los tests unitarios de titularidad en `__tests__/core/entitlement.test.ts`: arranque sin la compra, `grant()` notifica una sola vez, `grant()` idempotente, desuscripción idempotente
- [X] T016 [P] Implementar `formatCoordinates`, `googleMapsUrl` y `appleMapsUrl` en `src/core/navigation/links.ts`
- [X] T017 [P] Escribir los tests unitarios de enlaces en `__tests__/core/links.test.ts`, comprobando **punto decimal invariable respecto del idioma**, seis decimales, coordenadas negativas y escapado del nombre
- [X] T018 [P] Definir los puertos `SavedLocationsStore` y `PreferencesStore` en `src/core/storage/ports.ts` e implementar los dobles en memoria en `src/core/storage/in-memory.ts`, con modo "siempre falla" y `index.ts` de exportación
- [X] T019 [P] Escribir la batería de contrato de almacenamiento en `__tests__/core/storage.test.ts`: `save` idempotente, `remove` de lo no guardado, orden por recencia, y la regla de degradación (lectura fallida → valor por defecto, escritura fallida → descartada, **ningún método rechaza**)

### Persistencia nativa (data-model.md §1)

- [X] T020 Implementar el esquema SQL y las migraciones por `PRAGMA user_version` (tramo 0 → 1: `saved_locations` y `preferences`) en `src/platform/storage/schema.ts`
- [X] T021 Implementar el adaptador `SavedLocationsStore` sobre `expo-sqlite` en `src/platform/storage/saved-locations.ts`, envolviendo todo fallo en la degradación del contrato y registrándolo por `ContentLogger`
- [X] T022 Implementar el adaptador `PreferencesStore` sobre `expo-sqlite` en `src/platform/storage/preferences.ts`, con la misma degradación
- [X] T023 Ejecutar la batería de contrato de T019 también contra los adaptadores de SQLite en `__tests__/core/storage-sqlite.test.ts`, para que el doble y el adaptador cumplan el mismo contrato
- [X] T024 [P] Implementar el adaptador de sistema (abrir URL con `Linking`, escribir en portapapeles con `expo-clipboard`) en `src/platform/system/external.ts`

### Esqueleto de navegación (contracts/routes.md)

- [X] T025 Implementar los proveedores en `src/ui/providers/` (catálogo, titularidad suscrita a `EntitlementSource`, almacenes), cada uno exponiendo su estado de carga
- [X] T026 Implementar el layout raíz en `app/_layout.tsx`: `SafeAreaProvider` → `SQLiteProvider` → catálogo → titularidad → almacenes → `Stack`, con `paywall` en presentación modal y la pantalla de arranque visible hasta que los proveedores resuelvan. **Sin la redirección a onboarding todavía** (llega en US3, para que US1 y US2 sean entregables por separado)
- [X] T027 Implementar el layout de secciones en `app/(tabs)/_layout.tsx` con las cuatro pestañas (Mapa, Tips, Guardados, Perfil), sus iconos y el tema oscuro
- [X] T028 [P] Crear las cuatro rutas de sección como pantallas mínimas en `app/(tabs)/index.tsx`, `tips.tsx`, `saved.tsx` y `profile.tsx`, para que la navegación entre pestañas sea recorrible antes de tener contenido
- [X] T029 Implementar el anfitrión de paneles superpuestos en `src/ui/sheets/SheetHost.tsx` con `Modal` y `Animated` (D-004): fuera del historial, cerrable con el gesto de retroceso del sistema y con el toque en el fondo
- [X] T030 [P] Implementar los componentes compartidos en `src/ui/components/`: chip de filtro, tarjeta de lista, estado vacío y marcador de imagen con gradiente (FR-022)

**Checkpoint**: la app arranca, se navega entre las cuatro pestañas, la base de datos migra, el catálogo tiene 14 localizaciones y `npm run verify` pasa.

---

## Phase 3: User Story 1 - Recorrer el mapa y abrir una localización accesible (Priority: P1) 🎯 MVP

**Goal**: mapa real con los marcadores del catálogo, buscador y filtros funcionales, y ficha
completa de las localizaciones accesibles.

**Independent Test**: abrir la app en el mapa, comprobar un marcador por localización en su
coordenada, tocar una gratuita y verificar que la ficha muestra sus datos reales del catálogo,
con la distancia marcada como no disponible.

### Tests for User Story 1 ⚠️

> Escribir primero y comprobar que fallan antes de implementar.

- [X] T031 [P] [US1] Test de aceptación en `__tests__/screens/map.test.tsx`: el mapa renderiza un marcador por cada localización del catálogo, y los accesibles se distinguen de los bloqueados (US1 §1, FR-013, FR-014)
- [X] T032 [P] [US1] Test de aceptación en `__tests__/screens/map-search.test.tsx`: buscar "debod", "Argüelles" y "arguelles" filtra igual; seleccionar un chip de tipo filtra; los criterios se componen; sin resultados se informa (US1 §4 §5, FR-015, FR-016, FR-019)
- [X] T033 [P] [US1] Test de aceptación en `__tests__/screens/location-detail.test.tsx`: tocar una localización gratuita abre su ficha con nombre, barrio, mejor momento, EXIF, descripción de la toma, descripción del barrio y coordenadas; la distancia dice "Distancia no disponible" (US1 §2 §6, FR-020, FR-021)
- [X] T034 [P] [US1] Test de aceptación en `__tests__/screens/map-state.test.tsx`: abrir una ficha y volver atrás conserva la pestaña activa, el texto buscado y el chip seleccionado (US1 §3, FR-002)

### Implementation for User Story 1

- [X] T035 [US1] Implementar el componente único de mapa en `src/ui/map/LocationMap.tsx`, resolviendo con `Platform.select` entre `GoogleMaps.View` y `AppleMaps.View` y exponiendo una sola API (`markers`, `onMarkerPress`, `camera`) — **la única bifurcación de plataforma del proyecto** (D-003)
- [X] T036 [US1] Implementar la pantalla de mapa en `app/(tabs)/index.tsx`: proyectar cada localización con `viewLocation` y componer la lista de marcadores memoizada, con el nombre como etiqueta accesible
- [X] T037 [US1] Implementar el buscador de texto sobre `queryLocations` en `app/(tabs)/index.tsx`, con el estado de exploración `MapExploration` de data-model.md §2
- [X] T038 [US1] Implementar los chips de tipo de foto en `app/(tabs)/index.tsx`, tomando las etiquetas del catálogo más "Todo" (FR-016)
- [X] T039 [US1] Añadir el estado de "sin resultados" a `app/(tabs)/index.tsx` cuando la intersección de criterios queda vacía (caso límite de la spec)
- [X] T040 [US1] Implementar la ficha de localización en `app/location/[id].tsx` con todos los campos de FR-020, el marcador de imagen y "Distancia no disponible"
- [X] T041 [US1] Añadir el estado de "contenido no disponible" con vuelta atrás en `app/location/[id].tsx` para un identificador que no existe en el catálogo

**Checkpoint**: US1 funciona y se prueba sola. Es el MVP: un mapa navegable con fichas reales.

---

## Phase 4: User Story 2 - Tropezar con contenido bloqueado y desbloquear la guía (Priority: P1)

**Goal**: el flujo completo modo prueba → contenido bloqueado → paywall → comprado, contra las
localizaciones de pago reales del catálogo.

**Independent Test**: sin la compra, tocar una localización de pago y verificar que el aviso no
revela coordenadas, EXIF ni descripción; desbloquear, comprar y comprobar que esa misma
localización abre su ficha completa.

### Tests for User Story 2 ⚠️

- [ ] T042 [P] [US2] Test de aceptación en `__tests__/screens/locked-sheet.test.tsx`: tocar una localización de pago sin la compra abre el panel con nombre, barrio y zona aproximada, y **no** muestra coordenadas, EXIF ni descripción; "Seguir en modo prueba" cierra sin cambiar nada (US2 §1 §2, FR-010)
- [ ] T043 [P] [US2] Test de aceptación en `__tests__/screens/paywall.test.tsx`: el paywall muestra 9,99 € y el total real del catálogo; cerrarlo sin comprar devuelve a la pantalla anterior con la titularidad intacta (US2 §3 §6, FR-032, FR-012)
- [ ] T044 [P] [US2] Test de aceptación en `__tests__/screens/purchase-flow.test.tsx`: comprar lleva al mapa, abre el panel de compra completada, retira la barra de modo prueba y hace que la localización de pago abra ficha completa (US2 §4 §5, FR-030, FR-031)
- [ ] T045 [P] [US2] Test de aceptación en `__tests__/screens/premium-leakage.test.tsx`: **ningún campo reservado a la compra es alcanzable sin ella por ninguna ruta** — mapa, búsqueda, consejos relacionados y guardados (SC-003, FR-010)

### Implementation for User Story 2

- [ ] T046 [US2] Situar los marcadores bloqueados en `approximateArea` y los accesibles en `coords` en `app/(tabs)/index.tsx` — una localización bloqueada **nunca** se dibuja en su punto exacto (contracts/screens.md)
- [ ] T047 [US2] Implementar la barra de modo prueba en `app/(tabs)/index.tsx` con `catalogCounts`, visible solo sin la compra, con acceso al paywall (FR-017)
- [ ] T048 [US2] Implementar el panel de contenido bloqueado en `src/ui/sheets/LockedSheet.tsx`, alimentado **solo** por la `LocationPreview`, con las filas de candado nombrando lo que falta sin mostrar valores
- [ ] T049 [US2] Aplicar la regla R-3 de contracts/routes.md en el punto de toque de `app/(tabs)/index.tsx`: `viewLocation` decide entre navegar a la ficha o abrir el panel; ninguna pantalla comprueba `access` por su cuenta (FR-009)
- [ ] T050 [US2] Implementar el paywall en `app/paywall.tsx` con el precio fijo, las ventajas y los recuentos derivados del catálogo (FR-032, D-011)
- [ ] T051 [US2] Conectar el botón "Comprar" a `InMemoryEntitlementSource.grant()`, navegar a `/` descartando la entrada modal y abrir el panel de compra completada en `src/ui/sheets/PurchasedSheet.tsx` (FR-030, R-5)

**Checkpoint**: US1 y US2 funcionan por separado. El recorrido completo de la spec es demostrable.

---

## Phase 5: User Story 3 - Ver la app por primera vez (Priority: P2)

**Goal**: presentación de tres pasos que se muestra una sola vez y persiste su marca.

**Independent Test**: en instalación limpia, arrancar en el paso 1, recorrer los tres hasta el
mapa, cerrar y reabrir, y comprobar que arranca en el mapa.

### Tests for User Story 3 ⚠️

- [ ] T052 [P] [US3] Test de aceptación en `__tests__/screens/onboarding.test.tsx`: sin la marca, la app arranca en el paso 1 sin pestañas; el indicador refleja el paso; el paso 2 avanza igual aceptando que posponiendo y **no solicita permisos** (US3 §1 §2 §3)
- [ ] T053 [P] [US3] Test de aceptación en `__tests__/screens/onboarding-exits.test.tsx`: las cuatro salidas de la tabla R-2 llevan a su destino y **todas** escriben la marca, incluida la salida al paywall; con la marca puesta, la app arranca en el mapa (US3 §4 §5 §6, FR-005)

### Implementation for User Story 3

- [ ] T054 [US3] Implementar la ruta de presentación en `app/onboarding.tsx` con los tres pasos en estado local, el indicador de progreso y el copy del prototipo, tomando del catálogo el recuento y los nombres de las gratuitas (FR-012)
- [ ] T055 [US3] Añadir al layout raíz `app/_layout.tsx` la redirección condicional de la regla R-1: leer `onboarding.completed`, mantener la pantalla de arranque durante la lectura y **sustituir** la entrada de historial al redirigir
- [ ] T056 [US3] Implementar las cuatro salidas de la tabla R-2 en `app/onboarding.tsx`, escribiendo `onboarding.completed` en todas ellas antes de navegar

**Checkpoint**: primer arranque guiado; los siguientes van directos al mapa.

---

## Phase 6: User Story 4 - Consultar los consejos sobre Madrid (Priority: P2)

**Goal**: feed de consejos agrupado por categoría, siempre gratuito, con salto a las
localizaciones relacionadas.

**Independent Test**: abrir la pestaña, comprobar el agrupado por categoría, filtrar, abrir un
consejo y saltar desde él a una ficha.

### Tests for User Story 4 ⚠️

- [ ] T057 [P] [US4] Test de aceptación en `__tests__/screens/tips.test.tsx`: los consejos se listan agrupados por categoría en el orden del catálogo; los chips filtran y "Todo" los restituye; **se ven completos con y sin la compra** (US4 §1 §2 §5, FR-011)
- [ ] T058 [P] [US4] Test de aceptación en `__tests__/screens/tip-detail.test.tsx`: el detalle muestra categoría, título, cuerpo y relacionadas; una relacionada inexistente se omite sin fallar; tocar una aplica R-3; volver atrás devuelve **al consejo**, no al mapa (US4 §3 §4, R-4)

### Implementation for User Story 4

- [ ] T059 [US4] Implementar la pantalla de consejos en `app/(tabs)/tips.tsx` sobre `tipsByCategory`, con encabezado y tarjetas
- [ ] T060 [US4] Implementar los chips de categoría en `app/(tabs)/tips.tsx` con las categorías del catálogo más "Todo"
- [ ] T061 [US4] Implementar el detalle de consejo en `app/tip/[id].tsx` con cuerpo completo y lista de localizaciones relacionadas, omitiendo las que no existen en el catálogo
- [ ] T062 [US4] Aplicar la regla R-3 al tocar una localización relacionada en `app/tip/[id].tsx`, reutilizando el mismo punto de decisión que el mapa

**Checkpoint**: la sección gratuita de la guía está completa.

---

## Phase 7: User Story 5 - Guardar localizaciones (Priority: P2)

**Goal**: lista personal persistida, reservada a quien tiene la compra.

**Independent Test**: con la compra, guardar dos localizaciones, verlas en la lista, reiniciar
la app y comprobar que siguen; desmarcar una y comprobar que desaparece.

### Tests for User Story 5 ⚠️

- [ ] T063 [P] [US5] Test de aceptación en `__tests__/screens/saved.test.tsx`: los tres estados de la tabla de contracts/screens.md (con compra y guardados, con compra sin guardados, sin compra); los identificadores que ya no existen en el catálogo se omiten (US5 §4 §5)
- [ ] T064 [P] [US5] Test de aceptación en `__tests__/screens/save-toggle.test.tsx`: guardar y desguardar desde la ficha; el orden es por recencia; sin la compra no se guarda nada y se ofrece desbloquear (US5 §1 §2 §6, FR-024, FR-027)
- [ ] T065 [P] [US5] Test de aceptación en `__tests__/screens/saved-persistence.test.tsx`: los guardados sobreviven a un remontaje completo del árbol de rutas (US5 §3, FR-025)
- [ ] T066 [P] [US5] Test de aceptación en `__tests__/screens/filters-sheet.test.tsx`: "solo guardados" deja únicamente los marcadores guardados; la distancia se muestra **inactiva y marcada como no disponible** (US5 §7, FR-018)

### Implementation for User Story 5

- [ ] T067 [US5] Implementar el control de guardar en `app/location/[id].tsx`, comprobando la titularidad **antes** de escribir y ofreciendo desbloquear si falta (FR-024, FR-027)
- [ ] T068 [US5] Implementar la pantalla de guardados en `app/(tabs)/saved.tsx` cruzando `SavedLocationsStore.list()` con el catálogo y descartando los identificadores huérfanos
- [ ] T069 [US5] Implementar los tres estados vacíos en `app/(tabs)/saved.tsx`, con CTA al paywall cuando no hay compra
- [ ] T070 [US5] Implementar el panel de filtros en `src/ui/sheets/FiltersSheet.tsx`: chips de tipo y "solo guardados" operativos, distancia visible pero inactiva, y resumen de resultados con el recuento real (FR-018)
- [ ] T071 [US5] Aplicar `onlySaved` a la composición de criterios de `app/(tabs)/index.tsx`, intersecando con la lista de guardados (FR-019)

**Checkpoint**: la guía completa aporta valor propio más allá de desbloquear contenido.

---

## Phase 8: User Story 6 - Llegar hasta el punto de disparo (Priority: P3)

**Goal**: abrir el punto en una app de mapas o copiar las coordenadas, de verdad.

**Independent Test**: desde una ficha accesible, pedir navegar, comprobar las tres opciones y
que la elegida entrega al sistema la ubicación correcta.

### Tests for User Story 6 ⚠️

- [ ] T072 [P] [US6] Test de aceptación en `__tests__/screens/nav-sheet.test.tsx`: el panel ofrece Google Maps, Apple Maps y copiar, con las coordenadas a la vista; elegir una app entrega a `Linking.openURL` **la URL exacta** con las coordenadas de esa localización (US6 §1 §2)
- [ ] T073 [P] [US6] Test de aceptación en `__tests__/screens/copy-coords.test.tsx`: copiar escribe en el portapapeles **el mismo texto que la ficha muestra** y lo confirma visualmente (US6 §3)

### Implementation for User Story 6

- [ ] T074 [US6] Implementar el panel de navegación en `src/ui/sheets/NavSheet.tsx` con las tres opciones, usando `googleMapsUrl` y `appleMapsUrl` del núcleo y el adaptador de sistema de T024
- [ ] T075 [US6] Conectar el botón "Navegar hasta la foto" de `app/location/[id].tsx` al panel, y mostrar las coordenadas con `formatCoordinates` en la ficha y en el panel (FR-023)
- [ ] T076 [US6] Implementar la confirmación visual de copiado en `src/ui/sheets/NavSheet.tsx`, con vuelta al estado inicial pasados unos segundos

**Checkpoint**: la guía es utilizable en la calle.

---

## Phase 9: User Story 7 - Consultar el estado de mi guía en el perfil (Priority: P3)

**Goal**: cuarta pestaña con la línea de plan dinámica y las filas informativas.

**Independent Test**: abrir el perfil en modo prueba y comprobar el recuento real; comprar y
comprobar que la línea pasa a guía completa.

### Tests for User Story 7 ⚠️

- [ ] T077 [P] [US7] Test de aceptación en `__tests__/screens/profile.test.tsx`: la línea de plan dice modo prueba con "{free} de {total}" sin la compra y guía completa con el total tras comprar; la oferta de desbloquear solo aparece sin la compra; las cinco filas se muestran sin acción (US7 §1 §2 §3, FR-012, FR-034)

### Implementation for User Story 7

- [ ] T078 [US7] Implementar la pantalla de perfil en `app/(tabs)/profile.tsx` con la línea de plan derivada de `catalogCounts` y la titularidad
- [ ] T079 [US7] Implementar la tarjeta de modo prueba en `app/(tabs)/profile.tsx` con acceso al paywall, visible solo sin la compra
- [ ] T080 [US7] Implementar en `app/(tabs)/profile.tsx` las cinco filas informativas (descarga sin conexión, app de navegación, mi equipo, idioma, restaurar compra) **sin acción asociada**, presentadas como informativas y no como controles rotos (FR-034)

**Checkpoint**: las siete historias funcionan de forma independiente.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T081 [P] Verificar que ninguna pantalla consulta `useColorScheme` ni usa color literal fuera de `src/ui/theme/tokens.ts` (FR-033)
- [ ] T082 [P] Verificar que ningún fichero de `app/` importa `expo-maps`, `expo-sqlite`, `expo-clipboard` ni `Linking` directamente, y que ningún módulo de `src/core/` importa `react`, `react-native` ni `expo-*` — añadir un test que lo compruebe en `__tests__/core/purity.test.ts` (principio I)
- [ ] T083 [P] Revisar que todo elemento pulsable de `app/` y `src/ui/` expone nombre accesible, y que los paneles de `src/ui/sheets/` anuncian su apertura a lectores de pantalla
- [ ] T084 Memoizar la lista de marcadores en `app/(tabs)/index.tsx` para que solo se recalcule al cambiar búsqueda, filtro o titularidad (objetivo de rendimiento de plan.md)
- [ ] T085 Añadir un test de degradación en `__tests__/screens/storage-failure.test.tsx`: con el almacén en modo "siempre falla", la app arranca mostrando la presentación y con la lista de guardados vacía, sin lanzar (FR-028)
- [ ] T086 Actualizar `README.md` con el requisito de development build, la clave de API de Google Maps para Android y el nuevo punto de entrada
- [ ] T087 Ejecutar `npm run verify` completo y dejar las cuatro puertas en verde
- [ ] T088 Recorrer la validación manual de [quickstart.md](./quickstart.md) en Android **y** en iOS, comprobando la paridad funcional que exige el principio V

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias. T001 → T002 → T003 en orden; T004, T005 en paralelo; T006 tras T001
- **Foundational (Fase 2)**: depende de Setup. **BLOQUEA todas las historias**
  - T008 → T009 → T010 → T011 en cadena (catálogo antes que imágenes antes que registro antes que validación)
  - T012–T019 en paralelo entre sí (módulos de núcleo independientes)
  - T020 → T021, T022 → T023 (esquema antes que adaptadores antes que su verificación)
  - T025 → T026 → T027 → T028 (proveedores antes que layouts antes que rutas)
- **Historias (Fases 3–9)**: todas dependen de la Fase 2
- **Polish (Fase 10)**: depende de las historias que se quieran entregar

### User Story Dependencies

- **US1 (P1)**: solo depende de la Fase 2. Es el MVP
- **US2 (P1)**: solo depende de la Fase 2 para sus tests, pero **toca `app/(tabs)/index.tsx`**, que US1 crea (T046, T047). En la práctica se hace después de US1; si se paralelizan, coordinar ese fichero
- **US3 (P2)**: independiente. Toca `app/_layout.tsx` (T055), que la Fase 2 deja preparado
- **US4 (P2)**: totalmente independiente — ficheros propios (`tips.tsx`, `tip/[id].tsx`)
- **US5 (P2)**: depende de US1 para la ficha (T067) y toca el mapa (T071). Sus tests necesitan la titularidad concedida, que existe desde la Fase 2
- **US6 (P3)**: depende de US1 para la ficha (T075)
- **US7 (P3)**: totalmente independiente — fichero propio (`profile.tsx`)

### Within Each User Story

- Los tests se escriben **primero** y deben fallar antes de implementar
- Núcleo antes que adaptadores; adaptadores antes que pantallas
- La historia se cierra antes de pasar a la siguiente prioridad

### Parallel Opportunities

- **Fase 1**: T004 y T005 juntas
- **Fase 2**: los ocho módulos de núcleo T012–T019 a la vez; T024 y T030 en paralelo con ellos
- **Todos los tests de una misma historia** son paralelizables entre sí: ficheros distintos
- **US4 y US7 pueden desarrollarse en paralelo con cualquier otra historia**: no comparten ni un fichero con las demás
- US1 y US2 comparten `app/(tabs)/index.tsx`; US1, US5 y US6 comparten `app/location/[id].tsx`. Son los dos puntos de contención a vigilar si se reparte el trabajo

---

## Parallel Example: Fase 2, núcleo

```bash
# Los módulos de núcleo no se conocen entre sí: van a la vez
Task: "Implementar catalogCounts en src/core/content/counts.ts"
Task: "Implementar EntitlementSource e InMemoryEntitlementSource en src/core/entitlement/"
Task: "Implementar los constructores de URL en src/core/navigation/links.ts"
Task: "Definir los puertos de almacenamiento y sus dobles en src/core/storage/"
```

## Parallel Example: User Story 1

```bash
# Los cuatro tests de aceptación de US1, cada uno en su fichero
Task: "Test de mapa y marcadores en __tests__/screens/map.test.tsx"
Task: "Test de búsqueda y filtros en __tests__/screens/map-search.test.tsx"
Task: "Test de ficha de localización en __tests__/screens/location-detail.test.tsx"
Task: "Test de conservación de estado en __tests__/screens/map-state.test.tsx"
```

---

## Implementation Strategy

### MVP primero (US1)

1. Fase 1: Setup
2. Fase 2: Foundational (**crítica**: bloquea todo)
3. Fase 3: US1
4. **PARAR Y VALIDAR**: mapa navegable con fichas reales, probado solo
5. Demostrable en una development build

### Entrega incremental

1. Setup + Foundational → cimientos
2. US1 → mapa y ficha → **MVP**
3. US2 → el flujo de negocio completo → la demo que enseña el producto entero
4. US3, US4, US5 → primera impresión, contenido gratuito y guardados
5. US6, US7 → uso en la calle y estado de la guía
6. Fase 10 → pulido y validación en ambas plataformas

Cada escalón añade valor sin romper el anterior.

### Estrategia con varias personas

Tras la Fase 2:

- Persona A: US1 → luego US2 (comparten el fichero del mapa)
- Persona B: US4 → luego US7 (ninguna toca ficheros de otras historias)
- Persona C: US3 → luego US5 y US6 cuando US1 haya cerrado la ficha

---

## Notes

- Las tareas marcadas `[P]` tocan ficheros distintos y no dependen de nada pendiente
- **Los tests no son opcionales aquí**: el principio III de la constitución los exige en el
  mismo PR, y SC-007 pide cobertura de las siete historias
- Dos situaciones de acceso que el principio III exige —restaurar la compra en instalación
  limpia y estado de compra indeterminable— **no aparecen en esta lista a propósito**: no son
  ejercitables sin tienda ni persistencia de titularidad, y están registradas como deuda de la
  feature de pagos en el Complexity Tracking de [plan.md](./plan.md)
- Commits `feat:` y `fix:` únicamente, como exige la constitución
- Parar en cualquier checkpoint para validar la historia por separado
