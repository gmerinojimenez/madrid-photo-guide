# Research: Geolocalización de la persona usuaria

**Feature**: 004-user-geolocation | **Fecha**: 2026-09-24

Decisiones técnicas de esta feature, con su justificación y las alternativas descartadas.
La spec no dejó marcadores `[NEEDS CLARIFICATION]`: la única duda (orden por cercanía) se
resolvió sacándola del alcance. Lo que sigue fija *cómo* se materializa cada requisito.

Las versiones se han leído de `node_modules/expo/bundledNativeModules.json` (Expo SDK 57).
Las APIs de `expo-location` y `expo-maps` citadas se han comprobado en sus ficheros de tipos
(`build/Location.types.d.ts`, `build/*/…Maps.types.d.ts`) y en sus config plugins, no se
suponen.

---

## D-001 — Acceso a la ubicación: `expo-location` tras un puerto del núcleo

**Decisión**: `expo-location@~57.0.19`, consumido exclusivamente por un adaptador en
`src/platform/location/expo-device-location.ts` que implementa el puerto `DeviceLocation`
del núcleo (`src/core/location/ports.ts`). Ninguna pantalla, hook ni módulo de dominio
importa `expo-location`.

**Rationale**: es el módulo del propio SDK para permisos y posición en primer plano, y el
único que expone lo que la spec necesita distinguir:

- `requestForegroundPermissionsAsync()` / `getForegroundPermissionsAsync()` devuelven
  `status`, `canAskAgain` y el detalle de precisión por plataforma: `ios.accuracy:
  'full' | 'reduced'` y `android.accuracy: 'fine' | 'coarse' | 'none'` (FR-002).
- `watchPositionAsync({ distanceInterval })` entrega actualizaciones solo tras un
  desplazamiento mínimo, que es exactamente el umbral de 25 m de FR-013, resuelto por el
  sistema en lugar de por sondeo.
- `hasServicesEnabledAsync()` distingue "sin permiso" de "servicios de ubicación del sistema
  apagados" (caso límite de la spec).

El puerto sigue el patrón que la feature 003 estableció para almacenes y titularidad
(principio I): el núcleo define la forma, `platform/` pone lo nativo y los tests usan un
doble.

**Alternativas descartadas**:

- **Los permisos de `expo-maps`** (`requestPermissionsAsync`, `useLocationPermissions`): ya
  está instalado, pero solo da el estado del permiso, sin posición, sin precisión y sin
  seguimiento. Obligaría a sumar otra fuente para la posición y a repartir el permiso entre
  dos módulos.
- **`navigator.geolocation` (polyfill)**: no expone `canAskAgain` ni la precisión concedida,
  sin las que no se pueden distinguir los estados "denegada" / "denegada de forma
  permanente" / "aproximada" que exige la spec.

---

## D-002 — Modelo de estado del permiso

**Decisión**: el núcleo reduce la respuesta del sistema a cinco estados:

| Estado | Condición en la respuesta del sistema |
|---|---|
| `undetermined` (sin pedir) | `status === 'undetermined'` |
| `granted` (concedida) | `granted` y precisión `full` (iOS) o `fine` (Android) |
| `approximate` (aproximada) | `granted` y precisión `reduced` (iOS) o `coarse` (Android) |
| `denied` (se puede volver a preguntar) | `status === 'denied'` y `canAskAgain` |
| `blocked` (denegación permanente) | `status === 'denied'` y `!canAskAgain` |

La traducción vive en una función pura del núcleo (`toPermissionState`), que recibe la
respuesta ya aplanada por el adaptador. La acción de cada estado también es pura
(`permissionAction`): `request` para `undetermined` y `denied`; `openSettings` para
`approximate`, `blocked` y `granted` (US5 §2–§4).

**Rationale**: los cinco estados son exactamente los que la spec distingue en historias y
requisitos; la fila del perfil muestra cuatro (FR-009) porque `denied` y `blocked` se leen
igual, "denegada", y solo cambia la acción.

**Consecuencia de plataforma aceptada**: en iOS el sistema solo pregunta una vez, así que
una denegación es `blocked` de inmediato; en Android lo es tras la segunda. Es comportamiento
del sistema, no de la app, y queda dentro de lo que el principio V admite como divergencia
de UX de permisos.

**Alternativa descartada**: exponer a la UI el `PermissionResponse` crudo. Cada pantalla
tendría que repetir la combinación `status`/`canAskAgain`/precisión, y esa lógica es
exactamente la que el principio I exige en el núcleo.

---

## D-003 — Un único rastreador de ubicación en el núcleo

**Decisión**: una clase pura `LocationTracker` (`src/core/location/tracker.ts`) es la única
dueña del estado de ubicación de la app. Recibe por constructor el puerto `DeviceLocation`,
el `PreferencesStore` existente, el puerto de analítica y un reloj (`now: () => number`), y
expone:

- `snapshot()`: el `LocationSnapshot` vigente (permiso, servicios, posición).
- `subscribe(listener)`: cambios del snapshot.
- `request(origin)`: pide el permiso, registra el evento (FR-028) y, si se concede, arranca
  el seguimiento.
- `resume()` / `suspend()`: se llaman al volver a primer plano y al irse a segundo plano.
  `resume()` relee permiso y servicios (FR-007) y arranca o para el seguimiento según el
  resultado; `suspend()` lo para (FR-013, nada en segundo plano).

El proveedor React (`src/ui/providers/UserLocationProvider.tsx`) solo conecta `AppState` con
`resume`/`suspend` y publica el snapshot por contexto. No toma ninguna decisión.

**Rationale**: toda la lógica con estado de la feature —cuándo arrancar, qué hacer al
revocar, cuándo borrar la caché, cuándo una posición es antigua— queda testeable en Node con
el doble de `DeviceLocation`, sin renderizar (principio III). Es el mismo reparto que
`EntitlementSource` + `EntitlementProvider` en la feature 003.

**Alternativas descartadas**:

- **Un hook `useUserLocation` con la lógica dentro**: mezclaría reglas y React, y solo se
  podría probar renderizando.
- **Un estado global externo (Zustand, Redux)**: una dependencia nueva para un único estado
  que un contexto sirve igual de bien. La constitución prefiere no añadirla.

---

## D-004 — Seguimiento en primer plano: `watchPositionAsync` con 25 m

**Decisión**: con el permiso `granted` o `approximate` y la app activa, el adaptador llama a
`watchPositionAsync({ accuracy: Balanced, distanceInterval: 25 })`. El rastreador además
descarta cualquier lectura a menos de 25 m de la última aceptada (`movedEnough`), para que el
umbral de FR-013 no dependa de cómo interprete cada plataforma `distanceInterval`. Al pasar
a segundo plano, la suscripción se cancela; al volver, se recrea.

**Rationale**: `Balanced` (~100 m en el peor caso, habitualmente mucho mejor en ciudad) basta
para distancias que se muestran con una decimal en km y consume bastante menos batería que
`High`, en línea con "batería limitada" de la constitución. Con `approximate`, el sistema
entrega de todas formas posiciones gruesas; no se intenta mejorarlas.

**Alternativas descartadas**:

- **Lecturas puntuales con `getCurrentPositionAsync` al abrir cada pantalla**: no cumple la
  actualización en vivo de US1 §5.
- **Precisión `High` / `BestForNavigation`**: más batería sin beneficio visible para una
  distancia con una decimal.
- **Seguir en segundo plano para tener la posición lista al volver**: prohibido por FR-001 y
  cubierto de otra forma por la última posición conocida (D-006).

---

## D-005 — Distancia: haversine en el núcleo, formato fijo

**Decisión**: `distanceMeters(a, b)` con la fórmula de haversine sobre radio terrestre
medio de 6 371 008,8 m, en `src/core/location/geo.ts`. `formatDistance(meters)` devuelve
`"450 m"` (metros enteros, redondeo al más cercano) por debajo de 1 000 m y `"1,2 km"` (una
decimal, coma decimal) desde 1 000 m (FR-012). El formateo se hace a mano, no con
`Intl.NumberFormat`.

**Rationale**: haversine está muy por debajo del 1 % de error de SC-002 a escala urbana y
es una función pura de pocas líneas. El formateo manual evita depender del soporte de
`Intl` con locale `es` en Hermes, que varía según la build; con un solo formato fijo, el
código propio es más simple que verificar el motor.

**Alternativas descartadas**: Vincenty (más exacto, innecesario a esta escala); una librería
de geodesia (dependencia para una función); `Intl.NumberFormat('es-ES')` (ver arriba).

---

## D-006 — Última posición conocida en `PreferencesStore`

**Decisión**: la última posición aceptada se guarda en el `PreferencesStore` existente bajo
la clave `location.last`, como JSON `{ lat, lng, accuracy, timestamp }`, validado con el
`zod` que ya usa el núcleo al leerlo. El rastreador la carga al arrancar si el permiso está
concedido y la marca `source: 'cache'`; la sustituye la primera lectura en vivo. Se escribe
cada vez que se acepta una lectura (como mucho una vez cada 25 m). Se borra (se escribe la
cadena vacía, que se lee como ausente) cuando el permiso pasa a `denied` o `blocked`
(FR-025).

**Rationale**: no hace falta tabla ni migración SQL nuevas: es un único valor, y el almacén
de preferencias ya degrada sin fallar (FR-026, mismo contrato que FR-028 de la spec 003).
Validar al leer protege frente a un valor corrupto o de otra versión: si no valida, se trata
como ausente.

**Antigüedad (FR-024)**: `isStale(position, now)` es verdadero si han pasado más de 10 min
desde `timestamp`. Mientras la posición vigente venga de la caché, el proveedor fuerza una
reevaluación cada 60 s, para que una posición que era reciente al arrancar se marque como
antigua si no llega ninguna lectura. Con lecturas en vivo no hace falta: cada lectura trae su
propio `timestamp`.

**Alternativas descartadas**:

- **`getLastKnownPositionAsync()` del sistema en lugar de caché propia**: no es fiable en
  iOS tras reinicio y no permite aplicar la regla de borrado al revocar; además la spec pide
  explícitamente una caché propia en el dispositivo.
- **Tabla SQLite propia**: una migración para un único registro.

---

## D-007 — Distancia visible y contenido bloqueado: decisión en el módulo de acceso

**Decisión**: `src/core/content/access.ts` gana `visibleDistance(location, entitlement,
snapshot, now)`, junto a `viewLocation`. Recibe la `Location` completa —solo el núcleo la
tiene—, calcula la distancia exacta y devuelve a la UI un `VisibleDistance`:

- accesible (gratuita o con la compra): `{ kind: 'exact', meters, approximate, stale }`;
- de pago sin la compra: `{ kind: 'rounded', band, approximate, stale }`, donde `band` es
  `'under-1km'` o `{ halfKm: n }` (n × 0,5 km, redondeo al múltiplo más cercano, n ≥ 2);
- sin permiso o sin posición: `{ kind: 'unavailable', reason }`.

La UI nunca recibe los metros exactos de una localización bloqueada: el tipo `rounded` no
tiene campo `meters` (FR-020, SC-005). Es la misma técnica de la feature 003 con
`LocationPreview` sin `coords`: el compilador impide la fuga.

**Rationale**: FR-022 pide que la decisión viva en el único módulo de acceso. Si la UI
calculara distancias necesitaría las coordenadas exactas, que una `LocationPreview` no tiene
—y no debe tener—.

**Semántica del filtro con distancias redondeadas (FR-021)**: `withinRadius(distance,
radius)` compara con el valor que se ve. `under-1km` entra en `< 1 km` y en `< 3 km`;
`{ halfKm: n }` entra en `< 3 km` si n × 0,5 < 3. Una bloqueada a 2,8 km exactos se redondea
a 3,0 km y queda fuera de `< 3 km`: es la consecuencia aceptada de filtrar con lo que se ve,
y evita que el filtro se convierta en un oráculo de la distancia exacta.

**Alternativa descartada**: añadir la distancia a `LocationPreview`. Acoplaría la proyección
de contenido (estática) con la posición (cambiante) y obligaría a recalcular las
proyecciones con cada lectura.

---

## D-008 — "Lejos de Madrid" y disponibilidad del filtro

**Decisión**: `explorationAvailability(snapshot)` en el núcleo devuelve `available` o el
motivo de indisponibilidad: `no-permission`, `services-off`, `no-position` o
`far-from-madrid` (a más de 50 km de la Puerta del Sol, 40.416775, -3.703790). La UI la usa
para habilitar el filtro de distancia y mostrar el motivo (FR-015, FR-019). El radio elegido
se conserva en el estado de exploración de la pantalla, pero `effectiveRadius` lo trata como
`all` mientras no esté disponible, y vuelve a aplicarse solo si la disponibilidad se
recupera en la misma sesión (caso límite "criterio activo al salir del umbral").

**Revocación**: cuando el permiso deja de estar concedido, la pantalla del mapa devuelve el
radio a `all` (caso límite "revocación"), a diferencia de "lejos de Madrid", que es temporal.

**Rationale**: el filtro no puede dejar un mapa vacío sin explicación. Reutilizar la
Puerta del Sol como centro coincide con el "kilómetro cero" y con el centro del mapa.

---

## D-009 — Punto de posición y "centrar en mí" en el mapa

**Decisión**: `LocationMap` gana dos cosas:

- una prop `showsUserLocation`, que se traduce a `properties.isMyLocationEnabled` en
  `AppleMaps.View` y `GoogleMaps.View` (ambos la tienen), solo con el permiso concedido;
- un `ref` con `centerOn(coords)`, implementado con `setCameraPosition` de la ref nativa de
  cada vista.

El botón "Centrar en mí" es un control propio de la app, fuera del mapa, no el
`myLocationButtonEnabled` nativo. Tocarlo con el permiso sin pedir lanza el permiso
contextual (FR-003), cosa que el botón nativo no permite, y se ve y se comporta igual en
las dos plataformas (principio V).

**Rationale**: el punto azul nativo es gratis y lo dibuja el sistema con su precisión real
(incluido el círculo grande de la ubicación aproximada). La bifurcación sigue confinada en
`LocationMap.tsx`, la única que el proyecto admite (D-003 de la feature 003).

**Alternativa descartada**: dibujar el punto como un marcador propio. Habría que
reimplementar el círculo de precisión y actualizar un marcador en cada lectura, y lo
confundiría con los marcadores de localizaciones en el doble de test.

---

## D-010 — Peticiones contextuales y panel de ubicación

**Decisión**: todo punto que necesita la ubicación (filtro de distancia, "Centrar en mí",
distancia de la ficha) llama a una única función de UI, `ensureLocation(origin, onGranted)`,
del proveedor:

- `undetermined` → lanza directamente el diálogo del sistema; si se concede, ejecuta
  `onGranted` (FR-008).
- `denied` → abre el panel `LocationSheet`, con la explicación y el botón "Permitir
  ubicación", que relanza el diálogo solo si se pulsa (FR-006).
- `blocked`, o servicios apagados → abre `LocationSheet` con la explicación y "Abrir
  Ajustes" (`Linking.openSettings()`, de React Native).
- `granted` / `approximate` → ejecuta `onGranted` sin más.

`LocationSheet` es un panel más del `SheetHost` existente (D-004 de la feature 003), no una
ruta.

**Rationale**: en el estado `undetermined` el diálogo del sistema ya es la explicación; en
`denied` hace falta pedir confirmación antes de volver a preguntar (FR-006). Un único punto
de entrada garantiza SC-004: ningún diálogo sin una acción explícita.

**Abrir Ajustes**: `Linking.openSettings()` abre la pantalla de la app en los ajustes del
sistema en las dos plataformas. No hace falta `expo-intent-launcher`.

---

## D-011 — Evento de permiso: catálogo tipado + sumidero de consola

**Decisión**: se crea el catálogo de eventos tipado que exige el principio IV en
`src/core/analytics/events.ts`, con un único evento:

```ts
{ name: 'location_permission_result', state: 'granted' | 'approximate' | 'denied', origin: 'onboarding' | 'contextual' | 'profile' }
```

(`denied` agrupa `denied` y `blocked`, como FR-028). Lo emite `LocationTracker.request()` a
través del puerto `AnalyticsSink` (`track(event)`). La implementación de esta entrega es un
sumidero que escribe en consola, en `src/platform/system/console-analytics.ts`; los tests
usan un doble que acumula eventos.

**Rationale**: Firebase aún no está integrado (misma situación que en la feature 003). El
catálogo tipado y el puerto dejan el evento definido y comprobado por tests, de modo que la
feature de observabilidad solo tenga que poner el adaptador. El tipo del evento no admite
coordenadas, distancias ni identificadores (FR-027, SC-006).

**Alternativa descartada**: integrar Firebase Analytics aquí. Metería un SDK nativo y la
configuración por plataforma en una feature que no trata de observabilidad.

---

## D-012 — Configuración nativa: solo "mientras se usa"

**Decisión**: se añade el config plugin a `app.json`:

```json
["expo-location", {
  "locationWhenInUsePermission": "Madrid Photo Guide usa tu ubicación para decirte a qué distancia estás de cada localización y mostrarte en el mapa.",
  "locationAlwaysAndWhenInUsePermission": false,
  "locationAlwaysPermission": false,
  "isIosBackgroundLocationEnabled": false,
  "isAndroidBackgroundLocationEnabled": false,
  "isAndroidForegroundServiceEnabled": false
}]
```

El plugin de `expo-maps` se deja **sin** `requestLocationPermission`, para que un único
plugin sea dueño de los permisos de ubicación.

**Rationale**, comprobado en `plugin/build/withLocation.js`:

- Si no se pasan, el plugin rellena `NSLocationAlwaysAndWhenInUseUsageDescription` y
  `NSLocationAlwaysUsageDescription` con un texto por defecto. Pasar `false` las elimina del
  `Info.plist` (`createPermissionsPlugin` borra las claves con valor `false`). Así ni se
  declara ni se puede pedir la ubicación "siempre" (FR-001).
- En Android el plugin solo añade `ACCESS_COARSE_LOCATION` y `ACCESS_FINE_LOCATION`;
  `ACCESS_BACKGROUND_LOCATION` y `FOREGROUND_SERVICE_LOCATION` solo se añaden con los flags
  que aquí quedan en `false`. Declarar las dos permite al usuario elegir aproximada o precisa
  en Android 12+ (FR-002).
- El texto de uso está en español, explica el uso real y concuerda con el paso 2 de la
  presentación (FR-010). Como la app es solo en español, no hace falta localizarlo.

No se editan `ios/` ni `android/`: todo pasa por el plugin (restricción de prebuild de la
constitución).

---

## D-013 — Estrategia de test

1. **Unitarios del núcleo, en Node** (`__tests__/core/location/*.test.ts`):
   - `geo`: haversine contra distancias de referencia (SC-002), `movedEnough`,
     `isFarFromMadrid` en el umbral.
   - `format`: metros y km, límites de 999/1 000 m, coma decimal, bandas redondeadas.
   - `permission`: la tabla de D-002 y `permissionAction`.
   - `visibleDistance` (en `__tests__/content/access.test.ts`): exacta para gratuitas y con
     compra; redondeada sin compra, **sin campo `meters`**; no disponible sin permiso o
     posición; marcas `approximate` y `stale`.
   - `withinRadius` / `effectiveRadius` / `explorationAvailability`.
   - `LocationTracker` con el doble de `DeviceLocation`: los cinco estados, `request` por
     cada origen con su evento, arranque desde caché, antigüedad a los 10 min, borrado al
     revocar, `resume`/`suspend`, servicios apagados, lectura ignorada por debajo de 25 m,
     almacén que falla.
2. **Aceptación con `renderRouter`** (`__tests__/screens/location-*.test.tsx`): una por
   historia de usuario, más la regresión con permiso denegado (SC-003). Se ejercitan a
   través del doble de `expo-location` en `jest.setup.ts`, que gana ayudantes
   `__setLocationPermission(state)`, `__emitPosition(coords)` y `__setServicesEnabled(bool)`,
   con el mismo estilo que `__seedPreference` de `expo-sqlite`. `Linking.openSettings` se
   espía. La vuelta a primer plano se simula emitiendo el cambio de `AppState`.
3. **Estado por defecto del doble**: `undetermined`, sin posición. Así todos los tests de
   pantalla existentes siguen viendo "Distancia no disponible" y pasan sin cambios, que es
   la comprobación de SC-003.
4. **Lo que no se puede probar en JavaScript** —el diálogo real del sistema, el punto azul
   nativo, Ajustes— se cubre con la prueba manual de [quickstart.md](./quickstart.md) en las
   dos plataformas (principio III, "lo que no puede probarse en JavaScript").
5. **Pureza**: `__tests__/core/purity.test.ts` ya comprueba que `src/core/` no importa
   `react`, `react-native` ni `expo-*`; cubre automáticamente los módulos nuevos.

---

## Dependencias nuevas, con su justificación

| Paquete | Versión (SDK 57) | Por qué |
|---|---|---|
| `expo-location` | `~57.0.19` | Permiso en primer plano con `canAskAgain` y precisión concedida, seguimiento con umbral de distancia y estado de los servicios (D-001). Se instala con `npx expo install expo-location`. |

Ninguna más: "Abrir Ajustes" usa `Linking.openSettings()` de React Native, el punto azul
usa `expo-maps` (ya instalado), la caché usa `expo-sqlite` a través del `PreferencesStore`
existente y la validación usa `zod`, ya en el núcleo.
