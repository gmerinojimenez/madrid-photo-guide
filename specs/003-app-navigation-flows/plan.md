# Implementation Plan: Navegación y pantallas de la app

**Branch**: `gmj/madrid-photo-guide-nav-de6360` | **Date**: 2026-09-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-app-navigation-flows/spec.md`

## Summary

Construir la aplicación navegable completa: las cuatro secciones permanentes (mapa, consejos,
guardados, perfil), las pantallas apiladas (ficha de localización, detalle de consejo,
paywall), la presentación inicial y los cuatro paneles superpuestos, recorriendo de punta a
punta el flujo modo prueba → contenido bloqueado → paywall → comprado.

El enfoque: **Expo Router** con un árbol de rutas de fichero, alimentado en su totalidad por
el catálogo y la API de núcleo que entregó la feature 002 — `queryLocations`, `tipsByCategory`
y sobre todo `viewLocation`, que ya proyecta cada localización en dos tipos distintos según la
titularidad. Esa proyección es la que hace que "no filtrar un dato de pago" deje de ser una
disciplina de pantalla y pase a ser algo que el compilador impide: una pantalla que recibe una
`LocationPreview` no tiene ni el campo `coords` al que acceder.

Todo lo nativo entra por un puerto definido en el núcleo: el mapa (`expo-maps`) tras un único
componente que absorbe la diferencia entre Apple Maps y Google Maps; la persistencia
(`expo-sqlite`) tras dos interfaces de almacén con un doble en memoria para los tests; la
titularidad tras la misma interfaz que implementará RevenueCat después, hoy resuelta con una
implementación en memoria que arranca sin la compra.

Esta feature **amplía además el catálogo** con las nueve localizaciones de pago del prototipo,
de modo que el flujo de bloqueo se ejercite contra datos reales y no contra maquetas de
pantalla.

Las decisiones técnicas, con sus alternativas descartadas y las restricciones verificadas de
cada librería, están en [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript `~6.0.3` en modo `strict`, sobre Expo SDK 57 / React Native
0.86.3 (heredado de las features 001 y 002).

**Primary Dependencies**: `expo-router@~57.0.19` (navegación), `expo-maps@~57.0.2` (mapa,
**en alpha**), `expo-sqlite@~57.0.2` (persistencia), `expo-clipboard@~57.0.1`, más los
requisitos de Expo Router (`expo-constants`, `expo-linking`, `react-native-screens`,
`react-native-gesture-handler`) y `expo-splash-screen` / `expo-system-ui`. Versiones leídas de
`bundledNativeModules.json` del SDK 57, no supuestas. Justificación por paquete en
[research.md](./research.md#dependencias-nuevas-con-su-justificación).

**Storage**: SQLite local (`expo-sqlite`) con dos tablas —localizaciones guardadas y
preferencias— tras los puertos `SavedLocationsStore` y `PreferencesStore` del núcleo. El
contenido de la guía sigue siendo el JSON empaquetado de la feature 002. La titularidad **no
se persiste** en esta entrega (D-006).

**Testing**: Jest con preset `jest-expo`. Unitarios del núcleo en Node; aceptación con
`renderRouter` de `expo-router/testing-library` montando el árbol de rutas real; módulos
nativos falseados en `jest.setup`. Los tests nunca viven dentro de `app/`, porque Expo Router
reserva ese directorio para rutas y layouts.

**Target Platform**: Android e iOS, en **development build** — `expo-maps` no funciona en Expo
Go. Android exige además una clave de API de Google Maps para que el mapa renderice.

**Project Type**: aplicación móvil multiplataforma. Una única bifurcación de plataforma,
confinada a `src/ui/map/LocationMap.tsx` y justificada en D-003.

**Performance Goals**: transición entre secciones y apertura de ficha sin salto perceptible
(objetivo 60 fps); el mapa dibuja los 14 marcadores del catálogo sin trabajo por fotograma —la
lista de marcadores se memoiza y solo se recalcula al cambiar búsqueda, filtro o titularidad.
Las animaciones de los paneles no bloquean el hilo de JavaScript.

**Constraints**: sin conectividad para todo lo de esta entrega salvo la tesela del mapa;
ningún dato reservado a la compra alcanzable sin ella por ninguna ruta; arranque tolerante a
un almacén local ilegible; tema oscuro único.

**Scale/Scope**: 8 rutas, 4 paneles superpuestos, 14 localizaciones y 5 consejos en el
catálogo, 7 historias de usuario, 34 requisitos funcionales.

## Constitution Check

*GATE: comprobado antes de Phase 0 y de nuevo tras el diseño de Phase 1.*

| Principio | Cómo lo cumple este plan | Estado |
|-----------|--------------------------|--------|
| **I. Núcleo compartido en TypeScript puro** | El núcleo gana cuatro módulos —`entitlement/`, `navigation/links.ts`, `storage/` (puertos) y `content/counts`— todos sin `react`, `react-native` ni `expo-*`, ejecutables en Node. Lo nativo queda tras puertos: `expo-sqlite` en `src/platform/storage/`, `expo-maps` en `src/ui/map/`, portapapeles y enlaces en `src/platform/system/`. Ninguna pantalla importa un SDK directamente. | ✅ |
| **II. Serverless y cliente-primero** | Cero servidores y cero servicios gestionados nuevos: la titularidad de esta entrega es una implementación en memoria, no una integración. El contenido sigue empaquetado, así que todo funciona sin red salvo la tesela del mapa, que degrada a mapa vacío con los marcadores encima. | ✅ |
| **III. Testing por feature** | Unitarios de núcleo (titularidad, enlaces, recuentos, puertos de almacén contra el doble en memoria) y aceptación con `renderRouter` cubriendo las siete historias. Las reglas de acceso se cubren para "sin compra" y "con compra"; las otras dos situaciones que exige el principio no son ejercitables sin tienda ni persistencia de titularidad. | ⚠️ ver Complexity Tracking |
| **IV. Firebase como plano de observabilidad** | No se añade telemetría ni ningún SDK de analítica, experimentación o errores. Los fallos del almacén local se registran por la interfaz de log que ya existe en el núcleo, lista para conectarse a Crashlytics. Ninguna feature de usuario nueva queda tras un flag remoto porque aún no hay Remote Config: se registra como deuda en Complexity Tracking. | ⚠️ ver Complexity Tracking |
| **V. Paridad funcional con UX nativa** | Mismas capacidades y mismas reglas en ambas plataformas. Una sola bifurcación, `LocationMap.tsx`, impuesta por `expo-maps` (Apple Maps en iOS, Google Maps en Android) y confinada a un fichero: divergencia visual, no de capacidades, que es justo lo que el principio admite. La única diferencia observable es qué app de mapas ofrece el sistema al navegar. | ✅ |
| **VI. Freemium de compra única** | Ni cuentas ni login ni sesión. La decisión de acceso sigue concentrada en `core/content/access.ts` y se consume vía `viewLocation`, que devuelve tipos distintos: una pantalla no puede leer un campo de pago de una vista previa aunque quiera. La interfaz de titularidad es la que implementará RevenueCat. Sin suscripciones y con un único producto. | ✅ |
| **Restricciones tecnológicas** | Once dependencias nuevas, todas del ecosistema Expo, instaladas con `expo install` y justificadas una a una en research.md. `strict` activo, sin `any` ni `@ts-ignore`. Navegación única y declarativa. Sin edición manual de `ios/` ni `android/`: la clave de Maps se declara en la configuración de la app. La clave de Google Maps para Android está restringida por paquete y huella, así que no es un secreto en el sentido de la constitución. | ✅ |
| **Flujo y puertas de calidad** | Spec → plan → tasks antes de implementar. Las puertas de CI existentes (tipos, lint, validación de catálogo, tests) siguen siendo obligatorias, y la ampliación del catálogo está diseñada para mantener verde `validate:catalog` (D-010). Commits `feat:`/`fix:`. | ✅ |

**Resultado del gate (pre-Phase 0)**: pasa, con dos desviaciones registradas en Complexity
Tracking.

**Resultado del gate (post-Phase 1)**: pasa. El diseño de [data-model.md](./data-model.md) y
[contracts/](./contracts/) no añade dependencias, servicios ni bifurcaciones más allá de las
declaradas arriba, y mantiene la decisión de acceso en un único módulo del núcleo. Las dos
desviaciones siguen siendo las mismas y no han crecido.

## Project Structure

### Documentation (this feature)

```text
specs/003-app-navigation-flows/
├── plan.md              # Este fichero
├── research.md          # Phase 0: decisiones técnicas (D-001 … D-013)
├── data-model.md        # Phase 1: entidades, esquema SQLite, ampliación del catálogo
├── quickstart.md        # Phase 1: cómo levantar y validar la feature
├── contracts/           # Phase 1: contratos de navegación, núcleo y UI
│   ├── routes.md
│   ├── core-api.md
│   └── screens.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — no lo crea /speckit-plan)
```

### Source Code (repository root)

```text
app/                              # NUEVO: árbol de rutas de Expo Router
├── _layout.tsx                   # Stack raíz: proveedores + arranque condicional
├── onboarding.tsx                # presentación inicial, 3 pasos en una ruta
├── (tabs)/
│   ├── _layout.tsx               # las cuatro secciones permanentes
│   ├── index.tsx                 # Mapa
│   ├── tips.tsx                  # Consejos
│   ├── saved.tsx                 # Guardados
│   └── profile.tsx               # Perfil
├── location/[id].tsx             # ficha de localización
├── tip/[id].tsx                  # detalle de consejo
└── paywall.tsx                   # paywall, presentación modal

src/
├── core/                         # TypeScript puro, sin React ni nativo
│   ├── content/                  # EXISTENTE (feature 002)
│   │   ├── schema.ts  catalog.ts  access.ts  query.ts
│   │   ├── images.ts  localize.ts  logging.ts  index.ts
│   │   └── counts.ts             # NUEVO: recuentos derivados (FR-012)
│   ├── entitlement/              # NUEVO
│   │   ├── source.ts             # interfaz EntitlementSource
│   │   ├── in-memory.ts          # implementación de esta entrega
│   │   └── index.ts
│   ├── navigation/               # NUEVO
│   │   └── links.ts              # URL de mapas y formato de coordenadas
│   └── storage/                  # NUEVO: puertos, sin implementación nativa
│       ├── ports.ts              # SavedLocationsStore, PreferencesStore
│       ├── in-memory.ts          # doble usado por los tests
│       └── index.ts
├── platform/                     # adaptadores: aquí sí entra lo nativo
│   ├── images/registry.ts        # EXISTENTE (+18 entradas, D-010)
│   ├── storage/                  # NUEVO: adaptador expo-sqlite
│   │   ├── schema.sql.ts  saved-locations.ts  preferences.ts
│   └── system/                   # NUEVO: Linking + expo-clipboard
│       └── external.ts
├── ui/                           # NUEVO: componentes compartidos por las rutas
│   ├── theme/tokens.ts  icons.ts
│   ├── providers/                # contextos: catálogo, titularidad, almacenes
│   ├── map/LocationMap.tsx       # única bifurcación de plataforma (D-003)
│   ├── sheets/                   # los cuatro paneles superpuestos (FR-004)
│   └── components/               # chips, tarjetas, estados vacíos, placeholders
└── content/catalog.json          # EXISTENTE (+9 localizaciones, +6 barrios)

assets/content/photos/<id>/       # +18 JPG de marcador (D-010)

__tests__/                        # los tests NUNCA viven dentro de app/
├── content/                      # EXISTENTE (feature 002)
├── core/                         # NUEVO: unitarios de los módulos nuevos
└── screens/                      # NUEVO: aceptación con renderRouter
```

**Structure Decision**: se mantiene la separación en tres capas que la constitución impone y
que la feature 002 ya estableció —`core/` puro, `platform/` para lo nativo— y se añade `ui/`
para lo que es React pero no es una ruta. El directorio `app/` queda reservado a rutas y
layouts, sin lógica de dominio y sin tests, como exige Expo Router: una ruta compone
componentes de `src/ui/` y lee datos de `src/core/`, nada más.

El punto de entrada cambia a `expo-router/entry`, por lo que `index.ts` y `App.tsx`
desaparecen, y con ellos `__tests__/App.test.tsx`, sustituido por los tests de aceptación de
esta feature.

## Complexity Tracking

| Violación | Por qué es necesaria | Alternativa más simple, y por qué se rechaza |
|-----------|---------------------|---------------------------------------------|
| **Principio III: dos de las cuatro situaciones de acceso obligatorias quedan sin cubrir** — no hay test de "restaura la compra en instalación limpia" ni de "estado de compra indeterminable por fallo de red o de tienda". | Ninguna de las dos existe todavía como comportamiento: en esta entrega la titularidad es una implementación en memoria sin tienda, sin recibo y sin persistencia, así que un test de restauración probaría un artefacto de la maqueta, no el producto. Las dos situaciones que sí existen —sin compra y con compra— sí están cubiertas, y además extremo a extremo. | Adelantar la persistencia y la reconciliación de titularidad para poder probarlas: haría entrar el modelo de compra a medias, justo lo que la constitución prohíbe publicar sin flag, y obligaría a migrar el almacén cuando llegue RevenueCat. Se registra como deuda **a cubrir en la feature de pagos**, que es donde ese comportamiento nace. |
| **Principio IV: la feature no entrega tras un flag de Remote Config** con valor por defecto seguro. | Firebase todavía no está integrado en el proyecto: no hay Remote Config al que pedirle el flag. Además esta feature no añade una capacidad sobre un producto en producción — *es* el producto, y sin sus pantallas no hay app que publicar, así que un flag que la apagara dejaría una pantalla en blanco. | Integrar Firebase aquí para poder poner el flag: metería un SDK nativo, configuración por plataforma y una feature entera de observabilidad dentro de una feature de navegación. Se registra como deuda **a cubrir en la feature de observabilidad**, que es la que introduce Remote Config. |

Ambas desviaciones se corresponden con features posteriores ya previstas en el roadmap del
proyecto (pagos y observabilidad); ninguna pide relajar un principio, solo reconocer que el
comportamiento que el principio exige probar aún no existe.
