# Implementation Plan: Geolocalización de la persona usuaria

**Branch**: `claude/location-permission-spec-prompt-xfnrut` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-user-geolocation/spec.md`

## Summary

Hacer real la geolocalización que la feature 003 dejó marcada como "no disponible": pedir el
permiso de ubicación en primer plano (desde la presentación, de forma contextual o desde el
perfil), mostrar la distancia real en la ficha, el punto de posición y "centrar en mí" en el
mapa, y activar el filtro de distancia (< 1 km / < 3 km / Todo Madrid). Todo sin romper nada
de lo que ya funciona sin ubicación. El orden por cercanía queda fuera de alcance.

El enfoque: **`expo-location` tras un puerto del núcleo** (`DeviceLocation`) y un **único
rastreador puro** (`LocationTracker`) que es dueño del estado de ubicación: traduce la
respuesta del sistema a cinco estados de permiso, sigue la posición solo en primer plano con
umbral de 25 m, cachea la última posición en el `PreferencesStore` existente y emite un
evento anónimo por cada petición de permiso. La UI solo lo conecta con `AppState` y lo
publica por contexto.

La pieza delicada es el contenido bloqueado. La distancia se calcula **en el módulo de
acceso**, junto a `viewLocation`, y devuelve a la UI un tipo `VisibleDistance`: para una
localización de pago sin la compra, la variante `rounded` **no tiene campo de metros**, así
que el compilador impide que una pantalla muestre la distancia exacta. Es la misma técnica
con la que la feature 003 impidió filtrar las coordenadas (`LocationPreview` sin `coords`).

Las decisiones técnicas, con alternativas descartadas y APIs comprobadas en los tipos de las
librerías, están en [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript `~6.0.3` en modo `strict`, sobre Expo SDK 57 / React Native
0.86.3 (heredado).

**Primary Dependencies**: nueva `expo-location@~57.0.19` (versión de
`bundledNativeModules.json` del SDK 57). Se reutilizan `expo-maps` (punto de posición con
`isMyLocationEnabled`, centrado con `setCameraPosition`), `expo-sqlite` (vía
`PreferencesStore`), `zod` (validación de la caché) y `Linking.openSettings()` de React
Native. Justificación en [research.md](./research.md#dependencias-nuevas-con-su-justificación).

**Storage**: sin tablas ni migraciones. Una clave, `location.last`, en la tabla
`preferences` existente, a través del puerto `PreferencesStore` ([data-model.md §2](./data-model.md#2-persistencia)).

**Testing**: Jest con `jest-expo`. Unitarios del núcleo en Node con dobles de
`DeviceLocation`, `PreferencesStore` y `AnalyticsSink`; aceptación con `renderRouter` y un
doble controlable de `expo-location` en `jest.setup.ts` (research.md D-013). Prueba manual
en las dos plataformas para diálogo, punto nativo y Ajustes ([quickstart.md](./quickstart.md)).

**Target Platform**: Android e iOS, en development build. Cambia la configuración nativa
(plugin de `expo-location`), así que hace falta `expo prebuild` de nuevo.

**Project Type**: aplicación móvil multiplataforma. Sin bifurcaciones de plataforma nuevas:
el punto de posición y el centrado se resuelven dentro de `LocationMap.tsx`, la bifurcación
ya existente.

**Performance Goals**: distancia visible en < 2 s con buena señal, o al instante con caché
(SC-001); estado de permiso actualizado en < 1 s al volver de Ajustes (SC-007). Un recálculo
por lectura aceptada (como mucho cada 25 m), sin trabajo por fotograma: 14 distancias son
14 haversines.

**Constraints**: nada en segundo plano (ni seguimiento, ni permiso, ni declaración); ninguna
coordenada ni distancia fuera del dispositivo; ninguna distancia exacta de contenido
bloqueado alcanzable por la UI; ningún diálogo sin acción explícita; con el permiso denegado,
comportamiento idéntico a la feature 003.

**Scale/Scope**: 5 historias de usuario, 30 requisitos funcionales, 9 criterios de éxito;
5 pantallas tocadas (presentación, mapa, ficha, perfil y los paneles de filtros y bloqueado),
1 panel nuevo, 3 módulos nuevos en el núcleo (`location/`, `analytics/` y la ampliación de
`content/access.ts`).

## Constitution Check

*GATE: comprobado antes de Phase 0 y de nuevo tras el diseño de Phase 1.*

| Principio | Cómo lo cumple este plan | Estado |
|-----------|--------------------------|--------|
| **I. Núcleo compartido en TypeScript puro** | Toda la lógica —estados de permiso, distancia, formato, umbrales, radio, caché, antigüedad, transiciones— vive en `src/core/location/` y `src/core/analytics/`, sin `react`, `react-native` ni `expo-*`. `expo-location` entra solo por el adaptador de `src/platform/location/`, detrás del puerto `DeviceLocation`. El proveedor de UI no toma decisiones. `purity.test.ts` lo vigila. | ✅ |
| **II. Serverless y cliente-primero** | Cero servidores y cero servicios nuevos: la distancia se calcula en el dispositivo, sin rutas ni geocodificación. Funciona sin red: la posición viene del GPS, y la última conocida se cachea en el dispositivo. | ✅ |
| **III. Testing por feature** | Unitarios del núcleo para cada regla (lista en research.md D-013) y una aceptación por historia, más la suite anterior intacta como regresión con permiso denegado. Lo no ejecutable en JS (diálogo, punto nativo, Ajustes) va a la prueba manual de quickstart.md, tal como prevé el principio. Las reglas de acceso nuevas (distancia de bloqueadas) se prueban sin y con compra; las otras dos situaciones de acceso siguen siendo la deuda ya registrada en la feature 003, sin crecer. | ✅ |
| **IV. Firebase como plano de observabilidad** | Se crea el catálogo tipado de eventos en el núcleo y el puerto `AnalyticsSink`; el evento de permiso no admite coordenadas. Firebase aún no está integrado: el sumidero de esta entrega escribe en consola. Tampoco hay Remote Config para el flag de la feature. | ⚠️ ver Complexity Tracking |
| **V. Paridad funcional con UX nativa** | Mismas capacidades y reglas en las dos plataformas. "Centrar en mí" es un control propio y no el botón nativo, para que se comporte igual y sirva de punto contextual. Divergencias admitidas y documentadas: el aspecto del diálogo y de Ajustes, y que iOS solo pregunta una vez (`blocked` tras la primera denegación), comportamiento del sistema (research.md D-002). | ✅ |
| **VI. Freemium de compra única** | La decisión de qué distancia se ve vive en `core/content/access.ts`, junto a `viewLocation`, con la misma regla de acceso. La variante `rounded` no expone metros: el tipo impide la fuga (FR-020, SC-005). Sin cuentas ni identidad: la ubicación no identifica a nadie y no sale del dispositivo. | ✅ |
| **Restricciones tecnológicas** | Una dependencia nueva, del SDK, instalada con `expo install` y justificada. Configuración nativa solo por config plugin, con las claves de ubicación "siempre" eliminadas explícitamente (research.md D-012); sin tocar `ios/` ni `android/`. **Privacidad**: la restricción "los datos de localización no salen del dispositivo" y "la analítica no registra coordenadas" se cumple por diseño y se comprueba por test (FR-027, SC-006). **Rendimiento en campo**: seguimiento `Balanced` con umbral de 25 m y parado en segundo plano. `strict`, sin `any` ni `@ts-ignore`. | ✅ |
| **Flujo y puertas de calidad** | Spec → plan → tasks. Puertas de CI sin cambios y obligatorias. Commits `feat:`/`fix:`. La spec declara la feature como mixta: la distancia es para todos, redondeada sin la compra. | ✅ |

**Resultado del gate (pre-Phase 0)**: pasa, con una desviación registrada en Complexity
Tracking (principio IV), la misma que ya arrastraba la feature 003.

**Resultado del gate (post-Phase 1)**: pasa. El diseño de [data-model.md](./data-model.md) y
[contracts/](./contracts/) no añade dependencias, servicios ni bifurcaciones más allá de las
declaradas, mantiene la regla de acceso en un único módulo y resuelve la privacidad con
tipos (`rounded` sin metros, `AnalyticsEvent` sin coordenadas). La desviación del principio
IV no ha crecido: el catálogo tipado y el puerto la reducen, porque la integración futura
solo tiene que poner un adaptador.

## Project Structure

### Documentation (this feature)

```text
specs/004-user-geolocation/
├── plan.md              # Este fichero
├── research.md          # Phase 0: decisiones técnicas (D-001 … D-013)
├── data-model.md        # Phase 1: entidades, persistencia, transiciones
├── quickstart.md        # Phase 1: cómo levantar y validar la feature
├── contracts/           # Phase 1
│   ├── core-api.md      # API del núcleo: puerto, rastreador, distancia, analítica
│   └── screens.md       # cambios de UI respecto a la feature 003
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, no lo crea /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── onboarding.tsx                # CAMBIA: "Activar ubicación" pide el permiso
├── (tabs)/
│   ├── index.tsx                 # CAMBIA: punto de posición, "Centrar en mí", radio
│   └── profile.tsx               # CAMBIA: fila "Ubicación"
├── location/[id].tsx             # CAMBIA: distancia real, fila tocable sin permiso
└── _layout.tsx                   # CAMBIA: monta UserLocationProvider con el adaptador

src/
├── core/                         # TypeScript puro
│   ├── content/access.ts         # CAMBIA: + visibleDistance (FR-022)
│   ├── location/                 # NUEVO
│   │   ├── ports.ts              # DeviceLocation, RawPermission, RawReading
│   │   ├── permission.ts         # toPermissionState, permissionAction
│   │   ├── geo.ts                # haversine, umbrales, antigüedad
│   │   ├── format.ts             # formatDistance, formatVisibleDistance
│   │   ├── exploration.ts        # disponibilidad, radio efectivo, withinRadius
│   │   ├── cache.ts              # esquema zod y (de)serialización de location.last
│   │   ├── tracker.ts            # LocationTracker
│   │   ├── in-memory.ts          # InMemoryDeviceLocation (doble)
│   │   └── index.ts
│   └── analytics/                # NUEVO
│       ├── events.ts             # catálogo tipado (principio IV)
│       ├── sink.ts               # AnalyticsSink
│       ├── in-memory.ts          # doble
│       └── index.ts
├── platform/
│   ├── location/                 # NUEVO: único importador de expo-location
│   │   └── expo-device-location.ts
│   └── system/
│       ├── external.ts           # CAMBIA: + openSettings()
│       └── console-analytics.ts  # NUEVO: sumidero de esta entrega
└── ui/
    ├── providers/
    │   └── UserLocationProvider.tsx   # NUEVO: AppState → resume/suspend, ensureLocation
    ├── map/LocationMap.tsx       # CAMBIA: showsUserLocation + ref centerOn
    └── sheets/
        ├── FiltersSheet.tsx      # CAMBIA: chips de radio
        ├── LockedSheet.tsx       # CAMBIA: distancia redondeada
        └── LocationSheet.tsx     # NUEVO: panel de permiso denegado / Ajustes

app.json                          # CAMBIA: plugin expo-location (research.md D-012)
jest.setup.ts                     # CAMBIA: doble de expo-location + espía de openSettings

__tests__/
├── core/location/                # NUEVO: geo, format, permission, exploration, tracker
├── core/analytics.test.ts        # NUEVO
├── content/access.test.ts        # CAMBIA: + visibleDistance
└── screens/location-*.test.tsx   # NUEVO: una por historia
```

**Structure Decision**: se mantienen las tres capas de la feature 003 —`core/` puro,
`platform/` para lo nativo, `ui/` para lo React que no es ruta— y `app/` solo con rutas. La
ubicación sigue el patrón de la titularidad: un puerto y un objeto con estado en el núcleo,
un adaptador en `platform/` y un proveedor fino en `ui/providers/`. `analytics/` nace como
módulo propio del núcleo porque el catálogo de eventos es transversal y lo usarán features
futuras, no solo esta.

## Complexity Tracking

| Violación | Por qué es necesaria | Alternativa más simple, y por qué se rechaza |
|-----------|---------------------|---------------------------------------------|
| **Principio IV: el evento de permiso no llega a Firebase Analytics, y la feature no va tras un flag de Remote Config.** | Firebase sigue sin integrarse en el proyecto: no hay Analytics al que enviar ni Remote Config al que pedir el flag. Esta feature deja el evento declarado en el catálogo tipado del núcleo y emitido por un puerto, con un sumidero de consola, así que conectarlo es poner un adaptador. Sin flag, la protección que queda es la de la spec: con el permiso sin conceder la app se comporta exactamente como la 003 (SC-003), y el permiso solo se pide por acción explícita. | Integrar Firebase aquí para enviar el evento y poner el flag: metería SDKs nativos, configuración por plataforma y una feature entera de observabilidad dentro de una de geolocalización. Se mantiene como deuda **a cubrir en la feature de observabilidad**, la misma registrada en la feature 003. |
