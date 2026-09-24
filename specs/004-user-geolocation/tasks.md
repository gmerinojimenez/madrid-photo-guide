---

description: "Task list for feature implementation"
---

# Tasks: Geolocalización de la persona usuaria

**Input**: Design documents from `/specs/004-user-geolocation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **obligatorios, no opcionales.** El principio III de la constitución es NO
NEGOCIABLE: tests unitarios de núcleo y tests de aceptación de cada escenario, **en el mismo
PR**. Además SC-008 exige un test de aceptación por cada flujo de permiso y tests unitarios
de cada regla de cálculo. Por eso cada fase empieza por sus tests, que deben fallar antes de
implementar.

**Organization**: las tareas se agrupan por historia de usuario para que cada una pueda
implementarse, probarse y entregarse por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: a qué historia pertenece (US1…US5)
- Cada tarea lleva su ruta de fichero exacta

## Path Conventions

Las tres capas de la feature 003, que [plan.md](./plan.md) mantiene:

- `app/`: rutas de Expo Router (**nunca tests aquí**)
- `src/core/`: dominio en TypeScript puro, sin React ni nativo
- `src/platform/`: adaptadores de módulos nativos
- `src/ui/`: componentes React compartidos por las rutas
- `__tests__/`: todos los tests

## Reglas que toda tarea respeta

- Ninguna pantalla calcula una distancia: toda distancia sale de `visibleDistance` y se pinta
  con `formatVisibleDistance` (contracts/screens.md, R-G1).
- Ninguna pantalla ni efecto lanza el diálogo del sistema: solo `ensureLocation` o
  `request()` desde el manejador de un toque (R-G2).
- Solo `src/platform/location/expo-device-location.ts` importa `expo-location`.
- El doble de `expo-location` arranca en `undetermined` sin posición: los tests existentes
  de `__tests__/screens/` deben seguir pasando **sin modificarlos** (SC-003).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependencia, configuración nativa y doble de test listos.

- [X] T001 Instalar `expo-location` con `npx expo install expo-location` y verificar que `package.json` queda con `~57.0.19` (research.md, tabla de dependencias). Si `npm` falla por peer deps, usar `--legacy-peer-deps` como en CI
- [X] T002 Añadir a `app.json` el plugin `["expo-location", { … }]` exactamente con las opciones de research.md D-012: `locationWhenInUsePermission` con el texto en español, `locationAlwaysAndWhenInUsePermission: false`, `locationAlwaysPermission: false`, `isIosBackgroundLocationEnabled: false`, `isAndroidBackgroundLocationEnabled: false`, `isAndroidForegroundServiceEnabled: false`. No tocar el plugin `expo-maps` (sin `requestLocationPermission`)
- [X] T003 Añadir a `jest.setup.ts` el doble de `expo-location` con estado controlable dentro del factory de `jest.mock` (mismo estilo que el motor de `expo-sqlite`): `getForegroundPermissionsAsync`, `requestForegroundPermissionsAsync` (devuelven `{ status, granted, canAskAgain, ios: { accuracy }, android: { accuracy } }` según el estado), `hasServicesEnabledAsync`, `watchPositionAsync` (registra el callback y devuelve `{ remove }`), el enum `Accuracy`, y los ayudantes `__setLocationPermission(state)` —con `state` en `'undetermined' | 'granted' | 'approximate' | 'denied' | 'blocked'`—, `__answerNextRequestWith(state)`, `__emitPosition({ lat, lng })`, `__setServicesEnabled(bool)` y `__resetLocation()`. Estado inicial y tras cada test (`beforeEach`): `undetermined`, servicios activos, sin watchers
- [X] T004 En `jest.setup.ts`, espiar `Linking.openSettings` de `react-native` con `jest.fn` resuelta, y añadir un ayudante `__setAppState(state)` que emita el cambio a los oyentes de `AppState.addEventListener('change', …)`
- [X] T005 Ejecutar `npm test` y confirmar que toda la suite existente sigue en verde con los dobles nuevos cargados

**Checkpoint**: `npm run typecheck`, `npm run lint` y `npm test` pasan; nada del producto ha cambiado.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el núcleo de ubicación completo, la analítica tipada, la distancia visible en el
módulo de acceso, el adaptador nativo y el proveedor de UI. Todo lo que cualquier historia
necesita.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta que esta fase esté completa.

### Tests del núcleo (escribir primero; deben fallar)

- [X] T006 [P] Tests de `src/core/location/geo.ts` en `__tests__/core/location/geo.test.ts`: `distanceMeters` es 0 para el mismo punto, simétrica, y con error < 1 % frente a distancias de referencia (Puerta del Sol ↔ Templo de Debod ≈ 1 390 m, Puerta del Sol ↔ Toledo ≈ 67 km) (SC-002); `movedEnough` con 24 m / 25 m / `null`; `isFarFromMadrid` justo por debajo y por encima de 50 000 m; `isStale` a 10 min exactos (no antigua) y a 10 min + 1 ms (antigua)
- [X] T007 [P] Tests de `src/core/location/format.ts` en `__tests__/core/location/format.test.ts`: `formatDistance` con 0, 450, 999,4 ("999 m"), 999,6 ("1,0 km"), 1 000 ("1,0 km"), 1 234 ("1,2 km"), 12 345 ("12,3 km"), siempre coma decimal; `formatVisibleDistance` con cada fila de la tabla de data-model.md §1, incluidas las marcas `approximate` y `stale` combinadas y los tres motivos de `unavailable`
- [X] T008 [P] Tests de `src/core/location/permission.ts` en `__tests__/core/location/permission.test.ts`: cada fila de la tabla de research.md D-002 (incluido `granted` con `precision: null` → `granted`), `permissionAction` para los cinco estados e `isGranted`
- [X] T009 [P] Tests de `src/core/location/cache.ts` en `__tests__/core/location/cache.test.ts`: ida y vuelta de `serializePosition`/`parsePosition` (el resultado lleva `source: 'cache'`); `parsePosition` devuelve `null` sin lanzar con `null`, `""`, JSON inválido, campos que faltan, `accuracy` desconocida y tipos erróneos
- [X] T010 [P] Tests de `src/core/analytics/` en `__tests__/core/analytics.test.ts`: `InMemoryAnalyticsSink` acumula en orden; un test de tipos con `// @ts-expect-error` comprueba que `AnalyticsEvent` no admite campos `lat`, `lng`, `coords`, `meters` ni `locationId` (FR-027)
- [X] T011 [P] Tests de `visibleDistance` en `__tests__/content/access.test.ts` (ampliar el fichero existente): gratuita → `exact` con los metros correctos; de pago con la compra → `exact`; de pago sin la compra → `rounded` con `under-1km` por debajo de 1 000 m y `{ halfKm: round(m / 500) }` por encima (casos 1 100 → 2, 2 800 → 6, 1 249 → 2, 1 251 → 3); **el `JSON.stringify` del resultado `rounded` no contiene los metros exactos ni las coordenadas de la localización** (SC-005); sin permiso → `unavailable/no-permission`; concedido sin posición y servicios apagados → `services-off`; concedido sin posición → `no-position`; marcas `approximate` y `stale` propagadas
- [X] T012 Tests de `LocationTracker` en `__tests__/core/location/tracker.test.ts`, con `InMemoryDeviceLocation`, `InMemoryPreferencesStore`, `InMemoryAnalyticsSink` y un reloj falso: snapshot inicial antes de `start()`; `start()` en cada uno de los cinco estados; `start()` con permiso y `location.last` válida publica la posición con `source: 'cache'` y arranca un watcher; `request('onboarding' | 'contextual' | 'profile')` lanza el diálogo una vez, emite un evento con `state` (`blocked` → `denied`) y `origin`, y arranca el seguimiento si se concede; `request` en `blocked` no llama al sistema ni emite; lectura a < 25 m ignorada, a ≥ 25 m aceptada y escrita en `location.last`; la primera lectura en vivo sustituye a la cacheada aunque esté a < 25 m; `suspend()` deja `activeWatchers === 0` y conserva la posición; `resume()` tras cambiar el permiso "en Ajustes" aplica el nuevo estado; paso a `denied`/`blocked` → `position === null`, watcher parado y `location.last` borrada (FR-025); servicios apagados → `servicesEnabled: false` conservando la posición previa; `subscribe` no emite el estado inicial ni repite snapshots iguales; con `InMemoryPreferencesStore(true)` ("siempre falla") y con un `DeviceLocation` cuyo `watch` rechaza, nada lanza (FR-026)

### Implementación del núcleo (contracts/core-api.md)

- [X] T013 [P] Definir los tipos de data-model.md §1 (`PermissionState`, `UserPosition`, `LocationSnapshot`, `VisibleDistance`, `UnavailableReason`, `DistanceMarks`, `DistanceRadius`, `ExplorationAvailability`, `PermissionOrigin`) y el puerto `DeviceLocation` con `RawPermission` y `RawReading` en `src/core/location/ports.ts`, importando `LatLng` de `src/core/content/schema.ts`
- [X] T014 [P] Implementar `PUERTA_DEL_SOL`, `MOVE_THRESHOLD_M`, `FAR_FROM_MADRID_M`, `STALE_AFTER_MS`, `distanceMeters` (haversine, radio 6 371 008,8 m), `movedEnough`, `isFarFromMadrid` e `isStale` en `src/core/location/geo.ts` (research.md D-005)
- [X] T015 [P] Implementar `formatDistance` y `formatVisibleDistance` en `src/core/location/format.ts` a mano, sin `Intl` (research.md D-005), con los textos de data-model.md §1 y contracts/core-api.md
- [X] T016 [P] Implementar `toPermissionState`, `permissionAction` e `isGranted` en `src/core/location/permission.ts` (research.md D-002)
- [X] T017 [P] Implementar `LAST_POSITION_KEY`, `serializePosition` y `parsePosition` con un esquema `zod` en `src/core/location/cache.ts` (research.md D-006)
- [X] T018 [P] Implementar el catálogo `AnalyticsEvent` en `src/core/analytics/events.ts`, el puerto `AnalyticsSink` en `src/core/analytics/sink.ts`, `InMemoryAnalyticsSink` en `src/core/analytics/in-memory.ts` y `src/core/analytics/index.ts` (research.md D-011)
- [X] T019 Implementar `InMemoryDeviceLocation` en `src/core/location/in-memory.ts` con la API de contracts/core-api.md (`answerNextRequestWith`, `setPermission`, `setServicesEnabled`, `emit`, `activeWatchers`, `requestCount`); depende de T013
- [X] T020 Implementar `visibleDistance(location, entitlement, snapshot, now)` en `src/core/content/access.ts` usando `accessOf` y `distanceMeters`, con la variante `rounded` **sin campo de metros** (research.md D-007), y exportarla desde `src/core/content/index.ts`; depende de T013–T014
- [X] T021 Implementar `LocationTracker` en `src/core/location/tracker.ts` con las transiciones de data-model.md §4 y el contrato de contracts/core-api.md: sin temporizadores, reloj inyectado, sin excepciones hacia fuera; depende de T013–T019
- [X] T022 Crear `src/core/location/index.ts` exportando la API pública de `ports`, `geo`, `format`, `permission`, `cache`, `tracker` e `in-memory`
- [X] T023 Ejecutar T006–T012 y dejarlos en verde, y confirmar que `__tests__/core/purity.test.ts` sigue pasando con los módulos nuevos (principio I)

### Adaptadores y proveedor

- [X] T024 [P] Implementar `createExpoDeviceLocation()` en `src/platform/location/expo-device-location.ts`, único importador de `expo-location`: aplanar `ios.accuracy` (`full`/`reduced`) y `android.accuracy` (`fine`/`coarse`) a `precision`; `watch` con `watchPositionAsync({ accuracy: Accuracy.Balanced, distanceInterval: 25 })`; capturar todo fallo según el contrato de `DeviceLocation` (`undetermined`, servicios `true`)
- [X] T025 [P] Implementar el sumidero `consoleAnalytics` en `src/platform/system/console-analytics.ts`, que escribe `location_permission_result` con `state` y `origin` y nada más (research.md D-011)
- [X] T026 [P] Añadir `openSettings(): Promise<void>` a la interfaz `SystemLinks` y a `systemLinks` en `src/platform/system/external.ts`, con `Linking.openSettings()`
- [X] T027 Implementar `UserLocationProvider` y `useUserLocation()` en `src/ui/providers/UserLocationProvider.tsx`: recibe un `LocationTracker` por prop; llama a `start()` al montar; se suscribe a `AppState` y llama a `resume()` en `active` y a `suspend()` en `background`/`inactive`; publica `{ snapshot, now, ensureLocation, openSettings }` (contracts/screens.md); refresca `now` cada 60 s solo mientras `position.source === 'cache'` (research.md D-006); `ensureLocation(origin, onGranted)` implementa las ramas `undetermined` (llama a `tracker.request(origin)` y, si queda concedido, ejecuta `onGranted`) y `granted`/`approximate` (ejecuta `onGranted`). Las ramas `denied`/`blocked`/servicios apagados dejan un estado `pendingExplanation` en el contexto que completan T042–T043 en US2; hasta entonces no hacen nada visible. Exportarlo desde `src/ui/providers/index.ts`
- [X] T028 Montar `UserLocationProvider` en `app/_layout.tsx` dentro de `StoresProvider` (necesita `usePreferencesStore()`), construyendo un único `LocationTracker` con `createExpoDeviceLocation()`, el almacén de preferencias, `consoleAnalytics` y `Date.now`; memoizar el rastreador para que no se recree en cada render
- [X] T029 Ejecutar `npm run verify` y confirmar que toda la suite de pantallas existente sigue en verde **sin modificar ningún test** (SC-003)

**Checkpoint**: el rastreador vive montado en la app, con el permiso en `undetermined` nada cambia a la vista, y todo el núcleo está cubierto por tests.

---

## Phase 3: User Story 1 - Ver a qué distancia está cada localización (Priority: P1) 🎯 MVP

**Goal**: conceder la ubicación desde la presentación o desde la ficha y ver la distancia real, en vivo, con la marca de aproximada.

**Independent Test**: instalación limpia → "Activar ubicación" → conceder → abrir una localización gratuita → la ficha muestra una distancia real en el formato acordado.

### Tests for User Story 1 (escribir primero; deben fallar)

- [X] T030 [P] [US1] Test de aceptación en `__tests__/screens/location-onboarding.test.tsx`: en el paso de ubicación, "Activar ubicación" lanza el diálogo una vez (`requestForegroundPermissionsAsync` llamado) y avanza al último paso **tanto si se concede como si se deniega**; "Ahora no" avanza sin llamarlo (US1 §1, §2, FR-004)
- [X] T031 [P] [US1] Test de aceptación en `__tests__/screens/location-distance.test.tsx`: con permiso `granted` y una posición emitida, la ficha de una localización gratuita muestra la distancia en metros o en km con coma, no "Distancia no disponible" (US1 §3); con `approximate`, la distancia lleva "aproximada" (US1 §4); al emitir una posición a más de 25 m el valor cambia sin salir de la ficha (US1 §5)
- [X] T032 [P] [US1] Test de aceptación en `__tests__/screens/location-contextual.test.tsx`: con el permiso `undetermined`, la ficha muestra "Distancia no disponible" sin que se haya llamado al diálogo; al tocar la fila de distancia se lanza el diálogo y, al concederse y emitirse una posición, la distancia aparece sin volver a tocar (US1 §6, FR-008); abrir la ficha, volver y abrirla otra vez nunca llama al diálogo por sí solo (SC-004)
- [X] T033 [P] [US1] Test de aceptación en `__tests__/screens/location-cache.test.tsx`: con `location.last` sembrada vía `__seedPreference` y permiso `granted`, la ficha muestra la distancia sin emitir ninguna posición (FR-023); con una marca de tiempo de hace 11 min, la distancia lleva "posición antigua", y desaparece al emitir una posición nueva (FR-024)

### Implementation for User Story 1

- [X] T034 [US1] En `app/onboarding.tsx`, conectar "Activar ubicación" a `tracker.request('onboarding')` vía `useUserLocation()` y avanzar al paso siguiente al resolverse, con cualquier resultado; deshabilitar los botones del paso mientras la petición está en curso; si el permiso ya estaba concedido, avanzar sin petición (contracts/screens.md, presentación)
- [X] T035 [US1] En `app/location/[id].tsx`, sustituir la fila fija "Distancia no disponible" por `formatVisibleDistance(visibleDistance(location, entitlement, snapshot, now))`, con el `value` como valor de la fila y el `detail` como texto secundario (FR-011, FR-012, FR-014)
- [X] T036 [US1] En `app/location/[id].tsx`, hacer tocable la fila de distancia cuando el permiso no está concedido ("Activar ubicación" como detalle, rol de botón), llamando a `ensureLocation('contextual')` (US1 §6). El valor "Distancia no disponible" debe seguir siendo un `Text` propio, separado del detalle, para que `__tests__/screens/location-detail.test.tsx` y `map-state.test.tsx` sigan pasando sin cambios
- [X] T037 [US1] Ejecutar T030–T033 y dejarlos en verde

**Checkpoint**: US1 funciona sola: se puede conceder la ubicación y ver distancias reales en las fichas.

---

## Phase 4: User Story 2 - Usar la app sin dar la ubicación (Priority: P1)

**Goal**: con el permiso denegado todo sigue funcionando, se explica qué se pierde solo cuando la persona lo pide, se ofrece Ajustes si la denegación es permanente y la app refleja los cambios hechos en Ajustes.

**Independent Test**: con el permiso denegado se recorre la app entera sin ningún diálogo espontáneo; con la denegación permanente, tocar una función de ubicación ofrece abrir Ajustes.

### Tests for User Story 2 (escribir primero; deben fallar)

- [X] T038 [P] [US2] Test de aceptación en `__tests__/screens/location-denied.test.tsx`: con permiso `denied`, recorrer mapa, búsqueda, ficha, guardados, consejos y perfil sin que se llame al diálogo; la ficha dice "Distancia no disponible" (US2 §1, §4); al tocar la fila de distancia se abre el panel de ubicación **sin** llamar al diálogo, y solo "Permitir ubicación" lo llama (US2 §2, FR-006); "Ahora no" cierra el panel sin llamarlo
- [X] T039 [P] [US2] Test de aceptación en `__tests__/screens/location-blocked.test.tsx`: con permiso `blocked`, tocar la fila de distancia abre el panel con "Abrir Ajustes", que llama a `Linking.openSettings` y nunca al diálogo (US2 §3); con servicios apagados, el panel explica que la ubicación está desactivada en el teléfono y ofrece "Abrir Ajustes"
- [X] T040 [P] [US2] Test de aceptación en `__tests__/screens/location-settings-return.test.tsx`: con permiso `denied`, cambiarlo a `granted` con `__setLocationPermission`, emitir `__setAppState('background')` y luego `'active'`, emitir una posición y comprobar que la ficha muestra la distancia sin remontar el árbol; y al revés, de `granted` a `denied`: la distancia vuelve a "no disponible" y `location.last` queda vacía (US2 §5, FR-007, FR-025)

### Implementation for User Story 2

- [X] T041 [P] [US2] Crear `src/ui/sheets/LocationSheet.tsx` sobre `SheetHost`, con los tres casos de contracts/screens.md (panel de ubicación): `denied` ("Permitir ubicación" / "Ahora no"), `blocked` y servicios apagados ("Abrir Ajustes" / "Ahora no"), con los nombres accesibles del contrato y anuncio de apertura a lectores de pantalla
- [X] T042 [US2] En `src/ui/providers/UserLocationProvider.tsx`, completar `ensureLocation` para `denied`, `blocked` y servicios apagados: abrir `LocationSheet` guardando la acción pendiente; "Permitir ubicación" llama a `tracker.request(origin)` y, si se concede, cierra y ejecuta la acción pendiente; "Abrir Ajustes" llama a `openSettings()` y cierra **sin** ejecutar la acción pendiente (contracts/screens.md)
- [X] T043 [US2] Renderizar `LocationSheet` desde `UserLocationProvider` (o desde un host montado en `app/_layout.tsx`), de modo que el panel sirva a todas las pantallas y sea excluyente con los paneles de la pantalla activa
- [X] T044 [US2] Ejecutar T038–T040 y la suite completa de `__tests__/screens/` y dejarlas en verde (SC-003)

**Checkpoint**: US1 y US2 juntas cubren el ciclo completo del permiso sin romper nada de la feature 003.

---

## Phase 5: User Story 3 - Verme en el mapa y filtrar por lo que tengo cerca (Priority: P2)

**Goal**: punto de posición y "Centrar en mí" en el mapa, y filtro de distancia operativo, compuesto con los demás y consciente de "lejos de Madrid".

**Independent Test**: con el permiso concedido y una posición en la Puerta del Sol, el mapa muestra el punto de posición, "Centrar en mí" centra en él, y "< 1 km" deja solo las localizaciones cercanas.

### Tests for User Story 3 (escribir primero; deben fallar)

- [ ] T045 [P] [US3] Tests de `src/core/location/exploration.ts` en `__tests__/core/location/exploration.test.ts`: `explorationAvailability` con cada motivo y su orden de prioridad (contracts/core-api.md); `effectiveRadius` disponible y no disponible; `withinRadius` con `all`, `exact` en el límite estricto (999 m entra en `under-1km`, 1 000 m no), `unavailable` nunca entra, y `rounded` según el valor mostrado (`under-1km` entra en los dos radios; `{ halfKm: 5 }` entra en `under-3km`; `{ halfKm: 6 }` no)
- [ ] T046 [P] [US3] Test de aceptación en `__tests__/screens/location-map.test.tsx`: con permiso `granted`, la vista de mapa recibe `showsUserLocation` activado (el doble de `expo-maps` debe exponerlo, p. ej. con un `testID` o prop observable); con `undetermined`, no; "Centrar en mi posición" con `undetermined` lanza el diálogo y, al concederse con una posición, centra el mapa (el doble registra la llamada a `setCameraPosition`); con permiso y sin posición, no centra y muestra "Buscando tu posición…" (US3 §1, §2, §5)
- [ ] T047 [P] [US3] Test de aceptación en `__tests__/screens/location-radius.test.tsx`: con la posición en la Puerta del Sol, "< 1 km" deja solo los marcadores a menos de 1 km y el contador "Ver N localizaciones" coincide; se compone con búsqueda, etiqueta y "solo guardados" (US3 §3, FR-018); "Todo Madrid" deja de filtrar (US3 §4); con permiso `undetermined`, tocar "< 1 km" lanza el diálogo y, al concederse, aplica el radio (US3 §5); sin permiso, la fila muestra "Activa la ubicación para filtrar por distancia" (US3 §6)
- [ ] T048 [P] [US3] Test de aceptación en `__tests__/screens/location-far.test.tsx`: con "< 1 km" elegido, emitir una posición en Toledo muestra "Estás lejos de Madrid", el filtro deja de aplicarse (todos los marcadores visibles) y los chips quedan inactivos; volver a la Puerta del Sol reaplica "< 1 km" sin tocar nada; revocar el permiso devuelve el radio a "Todo Madrid" (FR-015, FR-019, casos límite)

### Implementation for User Story 3

- [ ] T049 [US3] Implementar `explorationAvailability`, `effectiveRadius` y `withinRadius` en `src/core/location/exploration.ts` y exportarlas desde `src/core/location/index.ts` (research.md D-008)
- [ ] T050 [US3] Ampliar `src/ui/map/LocationMap.tsx`: prop `showsUserLocation` traducida a `properties={{ isMyLocationEnabled }}` en `AppleMaps.View` y `GoogleMaps.View`, y `forwardRef` con `centerOn(coords)` implementado con `setCameraPosition` de la ref nativa de cada vista (research.md D-009); sin bifurcaciones fuera de este fichero
- [ ] T051 [US3] Ampliar el doble de `expo-maps` en `jest.setup.ts` para que exponga `properties.isMyLocationEnabled` de forma observable y registre las llamadas a `setCameraPosition` de su ref (`useImperativeHandle`), sin cambiar el comportamiento que usan los tests existentes
- [ ] T052 [US3] En `app/(tabs)/index.tsx`: añadir `radius` al estado de exploración (por defecto `'all'`); filtrar los marcadores memoizados con `withinRadius(visibleDistance(…), effectiveRadius(radius, explorationAvailability(snapshot)))` además de los criterios existentes; pasar `showsUserLocation` según `isGranted(snapshot.permission)`; volver `radius` a `'all'` cuando el permiso deja de estar concedido (data-model.md §3)
- [ ] T053 [US3] En `app/(tabs)/index.tsx`, añadir el botón "Centrar en mi posición" sobre el mapa, que llama a `ensureLocation('contextual', centrar)` y usa la ref de `LocationMap`; si no hay posición todavía, mostrar "Buscando tu posición…" en lugar de centrar
- [ ] T054 [US3] En `app/(tabs)/index.tsx`, mostrar el aviso "Estás lejos de Madrid: el filtro de distancia está en pausa" cuando hay un radio elegido distinto de `all` y la disponibilidad es `far-from-madrid`
- [ ] T055 [US3] En `src/ui/sheets/FiltersSheet.tsx`, sustituir la fila inactiva de distancia por los chips "< 1 km", "< 3 km" y "Todo Madrid" con las tres situaciones de contracts/screens.md (panel de filtros): nuevas props `radius`, `onRadiusChange` y `availability`; los chips de radio sin permiso llaman a `ensureLocation('contextual', aplicar radio)`; los inactivos llevan `accessibilityState={{ disabled: true }}` y el motivo como texto
- [ ] T056 [US3] Actualizar `__tests__/screens/filters-sheet.test.tsx` **solo** en la aserción que comprueba la fila "Distancia no disponible" del panel, que la feature 003 fijaba y esta feature sustituye a propósito por los chips de radio (FR-017); anotar el motivo en el propio test
- [ ] T057 [US3] Ejecutar T045–T048 y la suite completa y dejarlas en verde

**Checkpoint**: el mapa ya es consciente de la posición y el filtro funciona; US1 y US2 siguen intactas.

---

## Phase 6: User Story 4 - Distancia de lo que aún no he desbloqueado (Priority: P2)

**Goal**: ver una distancia redondeada de las localizaciones de pago sin la compra, que participan en el filtro sin revelar el punto exacto.

**Independent Test**: sin la compra, con permiso y posición, el panel de una localización bloqueada muestra "< 1 km" o "~N,5 km" y el valor no cambia al moverse unos metros salvo al cruzar un escalón.

**Dependencia**: el escenario §2 (filtro) necesita el filtro de US3.

### Tests for User Story 4 (escribir primero; deben fallar)

- [ ] T058 [P] [US4] Test de aceptación en `__tests__/screens/location-locked.test.tsx`: sin la compra, con permiso y posición, el panel de contenido bloqueado muestra la distancia redondeada ("< 1 km" o "~2,5 km") (US4 §1); desplazar la posición 100 m sin cruzar un escalón no cambia el texto; tras comprar, la ficha de esa misma localización muestra la distancia exacta (US4 §4)
- [ ] T059 [P] [US4] Test de aceptación en `__tests__/screens/location-locked-radius.test.tsx`: sin la compra, una localización de pago participa en "< 3 km" según su distancia redondeada, no la exacta (US4 §2, FR-021), usando una posición elegida para que la exacta y la redondeada queden a lados distintos del límite
- [ ] T060 [P] [US4] Ampliar `__tests__/screens/premium-leakage.test.tsx`: con permiso y posición, sin la compra, ningún texto renderizado en mapa, panel bloqueado ni panel de filtros contiene la distancia exacta en metros ni con una decimal distinta de ,0 o ,5 para una localización de pago (US4 §3, SC-005)

### Implementation for User Story 4

- [ ] T061 [US4] En `src/ui/sheets/LockedSheet.tsx`, sustituir la fila fija "Distancia no disponible" por `formatVisibleDistance` de la distancia `rounded` que le pase la pantalla (nueva prop `distance: VisibleDistance`), sin hacerla tocable (contracts/screens.md, panel bloqueado)
- [ ] T062 [US4] En `app/(tabs)/index.tsx`, calcular `visibleDistance` para la localización del panel bloqueado a partir de la `Location` del catálogo y pasarla a `LockedSheet`; la pantalla nunca lee los metros de una distancia `rounded` (el tipo no los tiene)
- [ ] T063 [US4] Ejecutar T058–T060 y la suite completa y dejarlas en verde

**Checkpoint**: la regla de acceso de la distancia está cubierta de punta a punta.

---

## Phase 7: User Story 5 - Consultar y cambiar el estado de la ubicación desde el perfil (Priority: P3)

**Goal**: una fila "Ubicación" en el perfil con el estado y la acción correspondiente.

**Independent Test**: recorriendo los cinco estados con el doble, la fila muestra la etiqueta correcta y hace la acción que le corresponde.

### Tests for User Story 5 (escribir primero; deben fallar)

- [ ] T064 [P] [US5] Test de aceptación en `__tests__/screens/location-profile.test.tsx`: para cada estado, la fila "Ubicación" muestra "Sin pedir", "Concedida", "Aproximada" o "Denegada" (US5 §1); con `undetermined` y `denied`, tocarla lanza el diálogo (US5 §2) y el evento registrado lleva `origin: 'profile'`; con `approximate`, `blocked` y `granted`, llama a `Linking.openSettings` sin diálogo (US5 §3, §4); tras cambiar el permiso y emitir `background` → `active`, la etiqueta cambia sin salir de la pantalla (FR-007)

### Implementation for User Story 5

- [ ] T065 [US5] En `app/(tabs)/profile.tsx`, añadir la fila "Ubicación" con la etiqueta de data-model.md §1 (`PermissionState`) y, al tocarla, `permissionAction(state) === 'request'` → `tracker.request('profile')`; si no, `openSettings()`, con el mismo estilo que las filas existentes
- [ ] T066 [US5] Ejecutar T064 y dejarlo en verde

**Checkpoint**: las cinco historias funcionan y se pueden probar cada una por separado.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: comprobaciones transversales, documentación y validación en las dos plataformas.

- [ ] T067 [P] Ampliar `__tests__/core/purity.test.ts` para comprobar además que `expo-location` solo se importa desde `src/platform/location/expo-device-location.ts`, y que ningún fichero de `app/` ni `src/ui/` importa `distanceMeters` (R-G1, FR-022)
- [ ] T068 [P] Añadir en `__tests__/screens/location-analytics.test.tsx` una comprobación de privacidad: tras pedir el permiso desde los tres orígenes y emitir posiciones, cada evento registrado solo tiene las claves `name`, `state` y `origin`, y ninguno contiene coordenadas ni distancias (FR-027, FR-028, SC-006)
- [ ] T069 [P] Revisar que todo elemento pulsable nuevo de `app/` y `src/ui/` expone el nombre accesible de contracts/screens.md y que `LocationSheet` anuncia su apertura a lectores de pantalla
- [ ] T070 [P] Actualizar `README.md`: nueva dependencia `expo-location`, necesidad de regenerar la development build (`npx expo prebuild --clean`) y cómo simular la posición en simulador y emulador (quickstart.md)
- [ ] T071 Ejecutar `npm run verify` completo y dejar las cuatro puertas en verde
- [ ] T072 Ejecutar `npx expo prebuild --clean` y comprobar en `ios/` y `android/` generados lo que exige quickstart.md: solo `NSLocationWhenInUseUsageDescription` en `Info.plist`, sin claves "Always" ni `location` en `UIBackgroundModes`; solo `ACCESS_COARSE_LOCATION` y `ACCESS_FINE_LOCATION` en el manifiesto, sin `ACCESS_BACKGROUND_LOCATION` ni `FOREGROUND_SERVICE_LOCATION` (FR-001). No versionar esos directorios
- [ ] T073 Recorrer la validación manual de [quickstart.md](./quickstart.md) en Android **y** en iOS, comprobando la paridad del principio V (SC-009)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias. T001 → T002; T003 y T004 tras T001; T005 al final
- **Foundational (Fase 2)**: depende de Setup. **BLOQUEA todas las historias**
  - T006–T012 (tests) en paralelo entre sí y antes de su implementación
  - T013 primero; T014–T018 en paralelo tras T013; T019 tras T013; T020 tras T013–T014; T021 tras T013–T019; T022 tras T021; T023 cierra el núcleo
  - T024–T026 en paralelo, independientes del núcleo salvo por los tipos de T013
  - T027 tras T021; T028 tras T024, T025 y T027; T029 cierra la fase
- **Historias (Fases 3–7)**: dependen de la Fase 2
- **Polish (Fase 8)**: depende de las historias que se quieran entregar

### User Story Dependencies

- **US1 (P1)**: solo depende de la Fase 2. Es el MVP
- **US2 (P1)**: solo depende de la Fase 2. Sus tests abren la ficha, así que conviene que US1 haya cambiado la fila de distancia (T036); si se paralelizan, coordinar `app/location/[id].tsx`
- **US3 (P2)**: solo depende de la Fase 2. Toca `app/(tabs)/index.tsx`, `LocationMap.tsx` y `FiltersSheet.tsx`
- **US4 (P2)**: depende de US3 para el escenario de filtro (T059) y comparte `app/(tabs)/index.tsx` con ella
- **US5 (P3)**: solo depende de la Fase 2. Fichero propio (`profile.tsx`)

### Within Each User Story

- Los tests se escriben **primero** y deben fallar antes de implementar
- Núcleo antes que adaptadores; adaptadores antes que pantallas
- La historia se cierra, con la suite completa en verde, antes de pasar a la siguiente prioridad

### Parallel Opportunities

- **Fase 2**: los siete ficheros de tests T006–T012 a la vez; los módulos T014–T018 a la vez; los adaptadores T024–T026 a la vez
- **Todos los tests de una misma historia** son paralelizables entre sí: ficheros distintos
- **US5 puede desarrollarse en paralelo con cualquier otra historia**: no comparte ficheros con las demás
- **US1 y US3** pueden ir en paralelo: US1 toca la presentación y la ficha; US3, el mapa y los filtros
- Puntos de contención: `app/(tabs)/index.tsx` (US3 y US4), `app/location/[id].tsx` (US1 y, por sus tests, US2), `jest.setup.ts` (T003, T004 y T051)

---

## Parallel Example: Fase 2, tests del núcleo

```bash
# Ficheros de test independientes: van a la vez
Task: "Tests de geo en __tests__/core/location/geo.test.ts"
Task: "Tests de format en __tests__/core/location/format.test.ts"
Task: "Tests de permission en __tests__/core/location/permission.test.ts"
Task: "Tests de cache en __tests__/core/location/cache.test.ts"
Task: "Tests de analítica en __tests__/core/analytics.test.ts"
Task: "Tests de visibleDistance en __tests__/content/access.test.ts"
```

## Parallel Example: User Story 3

```bash
# Los cuatro tests de US3, cada uno en su fichero
Task: "Tests de exploration en __tests__/core/location/exploration.test.ts"
Task: "Test del mapa con posición en __tests__/screens/location-map.test.tsx"
Task: "Test del filtro de radio en __tests__/screens/location-radius.test.tsx"
Task: "Test de lejos de Madrid en __tests__/screens/location-far.test.tsx"
```

---

## Implementation Strategy

### MVP primero (US1)

1. Fase 1: Setup
2. Fase 2: Foundational (**crítica**: bloquea todo)
3. Fase 3: US1
4. **PARAR Y VALIDAR**: conceder la ubicación y ver distancias reales en las fichas, probado solo
5. Demostrable en una development build regenerada

### Entrega incremental

1. Setup + Foundational → rastreador montado, sin cambios visibles
2. US1 → distancias reales → **MVP**
3. US2 → denegar sin quedarse atascado → el ciclo del permiso completo, seguro de publicar
4. US3 → punto azul, centrar y filtro de radio
5. US4 → distancia redondeada de lo bloqueado, que empuja a la compra
6. US5 → fila del perfil
7. Fase 8 → pulido y validación en las dos plataformas

Cada escalón añade valor sin romper el anterior. **No publicar US1 sin US2**: sin el panel de
denegación, una persona que deniega en iOS se queda sin forma de recuperar la ubicación
desde la app, salvo el perfil si ya está US5.

### Estrategia con varias personas

Tras la Fase 2:

- Persona A: US1 → luego US2 (la ficha y el panel de ubicación)
- Persona B: US3 → luego US4 (el mapa y los filtros)
- Persona C: US5, y después la Fase 8

---

## Notes

- Las tareas marcadas `[P]` tocan ficheros distintos y no dependen de nada pendiente
- **Los tests no son opcionales aquí**: el principio III los exige en el mismo PR, y SC-008
  pide un test de aceptación por flujo de permiso
- La única modificación de un test existente permitida es T056, porque la feature sustituye
  a propósito la fila que ese test fijaba; cualquier otro test de la feature 003 que falle
  indica una regresión, no un test a cambiar
- El envío a Firebase Analytics y el flag de Remote Config **no aparecen en esta lista a
  propósito**: están registrados como deuda de la feature de observabilidad en el Complexity
  Tracking de [plan.md](./plan.md)
- Commits `feat:` y `fix:` únicamente, como exige la constitución
- Parar en cualquier checkpoint para validar la historia por separado
