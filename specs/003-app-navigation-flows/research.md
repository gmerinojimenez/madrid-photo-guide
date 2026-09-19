# Research: Navegación y pantallas de la app

**Feature**: 003-app-navigation-flows | **Fecha**: 2026-09-19

Decisiones técnicas de esta feature, con su justificación y las alternativas descartadas.
Las decisiones de arquitectura que ya venían cerradas en la petición se registran igual,
porque el plan necesita fijar *cómo* se materializan, no solo *qué* se eligió.

Todas las versiones de este documento se han leído de
`node_modules/expo/bundledNativeModules.json` (Expo SDK 57), que es lo que `expo install`
resolvería. No son versiones supuestas.

---

## D-001 — Navegación: Expo Router 57, rutas de fichero

**Decisión**: `expo-router@~57.0.19` como única solución de navegación, con el árbol de
rutas en un directorio `app/` en la raíz del repositorio. El punto de entrada pasa a ser
`"main": "expo-router/entry"` en `package.json`, y desaparecen `index.ts` y `App.tsx`.

**Rationale**: la constitución exige "una única solución de navegación para todo el
proyecto, basada en rutas declarativas" y prohíbe mezclar enfoques por feature (FR-006).
Expo Router es la opción declarativa del propio SDK, no añade un ecosistema paralelo y trae
enlaces profundos gratis, que es lo que la feature de compartir localizaciones necesitará
después.

**Alternativas descartadas**:

- **React Navigation con navegadores declarados en código**: es la capa sobre la que Expo
  Router está construido, así que no ahorra dependencias, y deja el árbol de rutas en
  código imperativo en lugar de en ficheros.
- **Un conmutador de pantallas propio**: sería más simple hoy y una deuda inmediata:
  perderíamos historial, gestos de retroceso nativos, enlaces profundos y áreas seguras, y
  es exactamente lo que la constitución prohíbe.

**Consecuencia sobre el esqueleto existente**: `__tests__/App.test.tsx` prueba el montaje de
`App.tsx` y deja de tener sujeto. Se sustituye por los tests de aceptación de esta feature,
no se borra sin reemplazo.

---

## D-002 — Forma del árbol de rutas

**Decisión**:

```text
app/
├── _layout.tsx              # Stack raíz: proveedores + decisión de arranque
├── onboarding.tsx           # presentación inicial (3 pasos en una sola ruta)
├── (tabs)/
│   ├── _layout.tsx          # las cuatro secciones permanentes
│   ├── index.tsx            # Mapa
│   ├── tips.tsx             # Consejos
│   ├── saved.tsx            # Guardados
│   └── profile.tsx          # Perfil
├── location/[id].tsx        # ficha de localización (apilada)
├── tip/[id].tsx             # detalle de consejo (apilado)
└── paywall.tsx              # paywall (presentación modal)
```

**Rationale**: traduce literalmente FR-001 a FR-003. El grupo `(tabs)` no aparece en la URL,
así que las cuatro secciones cuelgan de la raíz y las pantallas apiladas son hermanas del
grupo, que es lo que hace que al cerrarlas se vuelva a la sección activa con su estado
intacto (US1 §3, FR-002).

Los tres pasos de la presentación viven en **una sola ruta** con el paso en estado local, no
en tres rutas. El paso no es un destino al que se pueda enlazar ni al que se deba poder
volver con el gesto de retroceso; modelarlo como tres rutas obligaría a limpiar el historial
al terminar.

**Arranque condicional**: el layout raíz lee la marca de presentación vista y redirige a
`onboarding` mientras no esté puesta (FR-005). Mientras la lectura está en curso se mantiene
la pantalla de arranque visible con `expo-splash-screen`, para no mostrar un fogonazo del
mapa antes de redirigir.

**Alternativas descartadas**:

- **Onboarding como grupo `(onboarding)` con una ruta por paso**: más ficheros, historial
  que limpiar y ninguna ventaja, porque los pasos no son enlazables.
- **Onboarding decidido dentro de la pantalla de mapa**: mezclaría dos pantallas en una y
  rompería FR-001.

---

## D-003 — Mapa: `expo-maps`, con una bifurcación de plataforma acotada

**Decisión**: `expo-maps@~57.0.2`. La librería expone **dos componentes distintos**,
`GoogleMaps.View` en Android y `AppleMaps.View` en iOS; no hay componente único. Se encapsula
esa diferencia en **un solo componente** del proyecto, `src/ui/map/LocationMap.tsx`, que
resuelve la plataforma con `Platform.select` y expone hacia dentro una única API
(`markers`, `onMarkerPress`, `camera`). Ninguna pantalla importa `expo-maps` directamente.

**Rationale**: la petición pide un mapa real y no un esquema dibujado. La constitución acepta
bifurcación de plataforma "limitada a lo inevitable" y exige justificarla en el PR: aquí es
inevitable —la librería no ofrece otra cosa— y queda confinada a un fichero, de modo que las
pantallas y los tests ven una sola API. Los marcadores se declaran como **prop de array**,
no como hijos, lo que encaja directamente con proyectar la lista del catálogo.

**Restricciones que impone y que el plan asume**:

1. **La librería está en alpha** y su propia documentación advierte de cambios rompientes
   frecuentes. Se fija la versión exacta del SDK y se confina el uso a un fichero,
   precisamente para que un cambio rompiente se absorba en un punto.
2. **No funciona en Expo Go**: exige development build. No es una restricción nueva —la
   constitución ya la da por asumida por Firebase y RevenueCat—, pero sí es la primera
   feature en la que se hace efectiva.
3. **Android exige una clave de API de Google Maps**: hay que registrar un proyecto en
   Google Cloud, habilitar Maps SDK for Android y declarar la clave en la configuración de
   la app. Es una clave restringida por huella y nombre de paquete, sin coste asociado a
   filtrarla, así que puede vivir en la configuración versionada; no es un secreto en el
   sentido de la constitución. **Es un requisito de puesta en marcha, no de código**, y sin
   él el mapa sale en blanco en Android.
4. **iOS usa Apple Maps** y varias capacidades finas (manejadores de pulsación sobre
   marcadores, monogramas) piden iOS 17+ o iOS 18+. El plan no depende de ninguna capacidad
   por encima de marcador + pulsación.

**Alternativas descartadas**:

- **`react-native-maps`**: más maduro y con API única multiplataforma, pero es una
  dependencia de fuera del ecosistema Expo para algo que el SDK ya cubre, y la petición pide
  `expo-maps` explícitamente.
- **Mapa esquemático dibujado a mano (como el prototipo)**: descartado por la petición, y con
  razón: los porcentajes `left`/`top` del prototipo son maqueta, no geografía, y no admiten
  zoom ni orientación.

---

## D-004 — Paneles superpuestos: `Modal` de React Native, no rutas

**Decisión**: los cuatro paneles (contenido bloqueado, navegar, filtros, compra completada)
se implementan con el componente `Modal` de React Native más `Animated` para el deslizamiento,
en `src/ui/sheets/`. No son rutas y no tocan el historial de navegación (FR-004).

**Rationale**: FR-004 lo pide explícitamente, y hay una razón de producto detrás: el panel de
contenido bloqueado aparece *sobre* el mapa sin perderlo de vista, y cerrarlo debe devolver
exactamente al mismo sitio. Modelarlos como rutas metería cuatro entradas en el historial y
haría que el gesto de retroceso del sistema navegase entre paneles.

`Modal` es API de React Native, sin dependencia nueva. La constitución prefiere "una API de
la plataforma a una dependencia".

**Alternativas descartadas**:

- **`@gorhom/bottom-sheet`**: da gestos de arrastre finos y accesibilidad ya resuelta, pero
  arrastra `react-native-reanimated` y `react-native-gesture-handler` como dependencias de
  primera línea para cuatro paneles que en el prototipo no tienen ni siquiera arrastre.
  Reconsiderable si los paneles ganan interacción.
- **Rutas con `presentation: 'transparentModal'`**: contradice FR-004 y ensucia el historial.

---

## D-005 — Persistencia: `expo-sqlite` detrás de un puerto del núcleo

**Decisión**: `expo-sqlite@~57.0.2` para los guardados y para la marca de presentación vista.
El núcleo define el **puerto** —interfaces `SavedLocationsStore` y `PreferencesStore` en
`src/core/storage/`, en TypeScript puro— y el **adaptador** de SQLite vive en
`src/platform/storage/`. Los tests usan una implementación en memoria del mismo puerto.

**Rationale**: `expo-sqlite` es un módulo nativo: necesita binarios de plataforma y **no
funciona en Jest bajo Node**. La constitución ya obliga a esta forma ("los módulos nativos se
consumen SIEMPRE tras una interfaz definida en el núcleo"; "en tests se usan implementaciones
en memoria"), y aquí además es lo único que permite probar las reglas de guardado sin
simulador.

**Forma concreta**: `SQLiteProvider` en el layout raíz con un `onInit` que aplica migraciones
versionadas con `PRAGMA user_version`, y acceso mediante `useSQLiteContext()`. Escrituras con
`runAsync`, lecturas con `getAllAsync` / `getFirstAsync`. Dos tablas y una versión de esquema:
ver [data-model.md](./data-model.md).

**Degradación (FR-028)**: si la apertura o la lectura falla, el adaptador devuelve los valores
por defecto seguros —presentación no vista, sin guardados— y registra el fallo por la
interfaz de log que ya existe en el núcleo. No se propaga la excepción a las pantallas.

**Alternativas descartadas**:

- **`expo-secure-store` o almacenamiento clave-valor**: sobra para la marca de onboarding y se
  queda corto para una lista de guardados que la feature de rutas querrá ordenar y anotar.
- **Escribir un fichero JSON**: sin transacciones ni consultas, y la constitución ya apunta a
  base de datos local para contenido con imágenes fuera de ella.

---

## D-006 — Titularidad: interfaz del núcleo + implementación de sustitución en memoria

**Decisión**: `src/core/entitlement/` define `EntitlementSource`, la interfaz que RevenueCat
implementará después:

```ts
type Entitlement = { owned: boolean };            // ya existe en core/content/access.ts
interface EntitlementSource {
  current(): Entitlement;
  subscribe(listener: (e: Entitlement) => void): () => void;
}
```

La implementación de esta entrega, `InMemoryEntitlementSource`, arranca en `{ owned: false }`
y expone `grant()`, que es lo que llama el botón de comprar. **No persiste** (FR-029). Al ser
lógica pura, vive en el núcleo y se prueba en Node sin fakes.

La reactividad hacia la UI (FR-031) se resuelve con un contexto de React en `src/ui/` que
envuelve la fuente y se suscribe: el contexto es UI, la fuente es núcleo.

**Rationale**: la constitución concentra la decisión de acceso en un único módulo y prohíbe
que las pantallas importen el SDK de la tienda. Definir ya la interfaz es lo que hará que la
feature de pagos sustituya una implementación sin tocar ninguna pantalla. El tipo
`Entitlement` ya existe en `core/content/access.ts` y se reutiliza tal cual: no se declara
uno nuevo.

**Alternativas descartadas**:

- **Un booleano en un contexto de React, sin interfaz de núcleo**: rápido, y dejaría la
  titularidad viviendo en la capa de UI, justo donde la constitución no la quiere.
- **Persistir la titularidad simulada**: la petición lo excluye, y con razón: haría falta
  después una migración para reconciliarla con la tienda, y la constitución dice que el
  almacén local es caché y nunca autoridad.

---

## D-007 — Navegar y copiar: construcción de URL en el núcleo, efecto en el borde

**Decisión**: la **construcción** de los enlaces es lógica pura y vive en
`src/core/navigation/links.ts`:

```ts
googleMapsUrl(coords: LatLng): string   // https://www.google.com/maps/search/?api=1&query=lat,lng
appleMapsUrl(coords: LatLng): string    // https://maps.apple.com/?ll=lat,lng&q=<nombre>
formatCoordinates(coords: LatLng): string  // "40.42400, -3.71766"
```

La **ejecución** usa `Linking.openURL` de React Native y `expo-clipboard@~57.0.1`, desde
`src/platform/system/`, tras una interfaz mínima del núcleo.

**Rationale**: separa lo que se puede probar en Node (que la URL lleva las coordenadas
correctas, con punto decimal y sin localizar) de lo que exige dispositivo (que el sistema
abra algo). Así US6 §2 se prueba de verdad en CI, comprobando la URL entregada, sin
simulador.

Se usan URL universales `https://` en lugar de esquemas `comgooglemaps://` para no depender de
que la app esté instalada y no tener que declarar consultas de esquemas en la configuración de
iOS. Si la app no está, el sistema abre el navegador o la tienda (caso límite de la spec).

**Formato de coordenadas**: seis decimales, punto decimal y coma como separador, igual que el
prototipo (`40.42400, -3.71766`). El texto que se copia y el que se muestra son el mismo.

**Alternativas descartadas**:

- **Esquemas nativos por app** (`comgooglemaps://`, `maps://`): permiten detectar si la app
  está instalada con `canOpenURL`, a cambio de declarar los esquemas en la configuración de
  iOS y de fallar en silencio si no lo están. No compensa para tres opciones fijas.
- **`expo-linking`**: es para enlaces *entrantes* hacia la app; abrir enlaces salientes es
  `Linking` de React Native. (`expo-linking` entra igualmente como dependencia de
  `expo-router`.)

---

## D-008 — Tema: solo oscuro, tokens del prototipo, tipografía del sistema

**Decisión**: un módulo `src/ui/theme/tokens.ts` con la paleta "Nocturne" leída del sistema de
diseño del prototipo (`design/Guía de fotografía Madrid/_ds/nocturne-*/styles.css`), y
`"userInterfaceStyle": "dark"` en la configuración de la app. Se elimina la bifurcación por
`useColorScheme` del esqueleto (FR-033).

Valores que se trasladan tal cual:

| Token | Valor |
|-------|-------|
| `bg` | `#161826` |
| `surface` | `#232532` |
| `text` | `#e9e9ed` |
| `accent` | `#9184d9` |
| `accent300` | `#d2cefd` |
| `section` | `#262a60` |
| `divider` | `#e9e9ed` al 16 % |
| `neutral300…900` | `#cfd3e5`, `#b2b6ca`, `#9397ab`, `#75798c`, `#595d6c`, `#3f424d`, `#292b31` |
| `radius` | `sm 4`, `md 8`, `lg 14` |

`--color-divider` es un `color-mix()` de CSS, que no existe en React Native: se traduce al
valor `rgba` equivalente, no se importa la expresión.

**Tipografía**: el sistema de diseño declara `"Inter", system-ui, sans-serif`. Se usa **el
tramo `system-ui`** de esa misma cadena, es decir la tipografía del sistema de cada
plataforma, sin añadir `expo-font` ni empaquetar Inter. La constitución prefiere la API de la
plataforma a una dependencia, y el principio V admite divergencia tipográfica entre
plataformas de forma explícita. Empaquetar Inter queda como mejora estética posterior, no
como requisito.

**Alternativas descartadas**:

- **Mantener claro y oscuro**: la petición lo excluye y el prototipo solo define oscuro.
  Inventar una paleta clara sería diseño no especificado.
- **Una librería de estilos (NativeWind, tamagui)**: dependencia grande para una paleta de
  veinte valores y una app de ocho pantallas.

---

## D-009 — Iconografía: `@expo/vector-icons`, con una tabla de equivalencias

**Decisión**: usar `@expo/vector-icons` (ya incluido con Expo, versión `^15.0.2`) y mantener
una tabla única de equivalencias en `src/ui/theme/icons.ts` que traduzca cada icono Phosphor
del prototipo a su equivalente disponible.

**Rationale**: el prototipo usa Phosphor porque es una página web con una hoja de iconos web.
Traer `phosphor-react-native` sería una dependencia nueva para conservar un juego de iconos
concreto; `@expo/vector-icons` ya viene con el SDK y cubre todos los conceptos que el
prototipo necesita (mapa, marcador, cámara, diafragma, temporizador, marcador de guardado,
candado, brújula, descarga, recibo, traducción). Concentrar la traducción en una tabla evita
que cada pantalla elija su propio icono para el mismo concepto.

**Alternativas descartadas**:

- **`phosphor-react-native`**: fidelidad exacta con el prototipo a cambio de una dependencia
  que hay que justificar; reconsiderable si el diseño se vuelve estricto en iconografía.

---

## D-010 — Ampliación del catálogo y sus consecuencias

**Decisión**: añadir al catálogo las nueve localizaciones de pago del prototipo, con
`access: "premium"` y ficha completa inventada, en el mismo formato que las cinco existentes.

Consecuencias que el plan debe cubrir, y que no son evidentes:

1. **El esquema exige `thumbnail` y `detailImage` en toda localización**, y el validador de
   la spec 002 falla si el JPG declarado no existe en el almacén. Por tanto hay que generar
   **18 JPG de marcador** (`thumb.jpg` y `detail.jpg` por localización) con el script que ya
   existe, `scripts/generate-placeholder-photos.py`. Se generan aunque ninguna pantalla de
   esta entrega los muestre (FR-022 pide bloques de color), porque si no `npm run
   validate:catalog` —que es puerta de CI— se pone en rojo.
2. **`src/platform/images/registry.ts` gana 18 entradas `require`**, por la misma razón de
   coherencia: el registro es la lista única de rutas literales del proyecto.
3. **Hay que declarar seis barrios nuevos**: Vallecas, Arganzuela, Moncloa, Retiro, Latina y
   Lavapiés, cada uno con su descripción (que es campo reservado a la compra). "Centro" ya
   existe.
4. **No hacen falta etiquetas nuevas**: los cinco tipos del prototipo (Skyline, Calle,
   Arquitectura, Atardecer, Nocturna) ya existen como `skyline`, `callejera`, `arquitectura`,
   `atardecer` y `nocturna`.
5. **Coordenadas reales, contenido ficticio**: las coordenadas son las verdaderas de cada
   sitio de Madrid, porque el mapa es real y los marcadores tienen que caer donde deben; las
   descripciones, los parámetros de captura y los mejores momentos son maqueta, igual que en
   las cinco existentes.

El catálogo queda en **14 localizaciones, 5 gratuitas**.

---

## D-011 — Recuentos derivados del catálogo

**Decisión**: un selector puro en el núcleo, `catalogCounts(catalog) → { total, free, premium }`,
en `src/core/content/query.ts`. Todo texto que muestre un recuento lo toma de ahí (FR-012).

**Rationale**: el prototipo escribe "60" en cinco sitios distintos. Con el catálogo real en 14,
cualquiera de esos literales sería mentira, y volvería a serlo cada vez que el catálogo
crezca. Derivarlo es además lo que hace verificable SC-004.

**Consecuencia sobre el copy del prototipo**: los textos que incrustan la cifra hay que
reescribirlos para que sigan siendo ciertos con cualquier catálogo. El titular del paywall
"60 localizaciones, con el punto exacto" pasa a construirse con el total real, y la barra de
modo prueba a "{gratis} de {total} localizaciones". Es un cambio de copy respecto del
prototipo, deliberado y exigido por FR-012.

---

## D-012 — Distancia no disponible

**Decisión**: no se instala `expo-location` ni se pide permiso alguno. Donde el prototipo
muestra una distancia, la app muestra "Distancia no disponible"; el filtro de distancia del
panel se renderiza inactivo y marcado como no disponible (FR-018, FR-021).

**Rationale**: la petición lo excluye. Se prefiere mostrar el hueco marcado como no disponible
antes que ocultarlo, para que la ausencia sea visible en el diseño y la feature de
geolocalización solo tenga que rellenarlo.

**Consecuencia**: `queryLocations` del núcleo ya documenta que no ordena por distancia porque
eso exige la posición del usuario. Esta feature no le añade nada.

---

## D-013 — Estrategia de test

**Decisión**: tres niveles, todos en `__tests__/`, ninguno dentro de `app/` (la documentación
de Expo Router lo prohíbe expresamente: el directorio `app/` solo contiene rutas y layouts).

1. **Unitarios de núcleo, en Node**: titularidad, construcción de URL, formato de
   coordenadas, recuentos del catálogo, puertos de almacenamiento contra su implementación en
   memoria. Sin render.
2. **Aceptación, con `renderRouter` de `expo-router/testing-library`**: monta el árbol de
   rutas real y recorre los escenarios de las siete historias como lo haría la persona
   usuaria, por texto y por rol. Es lo que permite probar de verdad "toco un marcador y se
   abre la ficha" y "cierro el paywall y vuelvo donde estaba".
3. **Módulos nativos falseados**: `expo-maps`, `expo-sqlite` y `Linking`/`expo-clipboard` se
   sustituyen por dobles en `jest.setup`. El doble de `expo-maps` renderiza los marcadores
   como elementos pulsables con su nombre accesible, que es justo lo que los tests necesitan
   tocar; el de almacenamiento es el fake en memoria del punto 1.

**Cobertura obligada por la constitución**: las reglas de acceso del principio VI se cubren
con tests unitarios explícitos para "sin compra" y "con compra". Las otras dos situaciones que
el principio exige —restauración en instalación limpia y estado de compra indeterminable— **no
son ejercitables en esta feature**, porque no hay tienda ni persistencia de titularidad; se
registran como deuda de la feature de pagos. Ver Complexity Tracking en [plan.md](./plan.md).

**Alternativas descartadas**:

- **Probar solo el núcleo, como en la spec 002**: allí estaba justificado porque la feature no
  entregaba pantallas. Aquí la feature *es* las pantallas: sin tests de render no se prueba
  nada de lo que la spec promete.
- **E2E sobre build real (Maestro/Detox)**: valioso y desproporcionado ahora. La constitución
  lo reserva para lo que no puede probarse en JavaScript —la hoja de compra de la tienda y los
  permisos del sistema—, y en esta entrega no hay ni una cosa ni la otra.

---

## Dependencias nuevas, con su justificación

Todas se instalan con `expo install` para respetar las versiones del SDK 57.

| Paquete | Versión SDK 57 | Por qué |
|---------|----------------|---------|
| `expo-router` | `~57.0.19` | Navegación declarativa exigida por la constitución (D-001) |
| `expo-maps` | `~57.0.2` | Mapa real pedido por la petición (D-003) |
| `expo-sqlite` | `~57.0.2` | Guardados y marca de onboarding persistentes (D-005) |
| `expo-clipboard` | `~57.0.1` | Copiar coordenadas (D-007) |
| `expo-constants` | `~57.0.17` | Requisito de `expo-router` |
| `expo-linking` | `~57.0.9` | Requisito de `expo-router` |
| `expo-splash-screen` | `~57.0.8` | Evitar el fogonazo de mapa antes de redirigir a onboarding (D-002) |
| `expo-system-ui` | `~57.0.3` | Fijar el color de fondo del sistema en tema oscuro (D-008) |
| `react-native-screens` | `~4.26.0` | Requisito de `expo-router` |
| `react-native-gesture-handler` | `~2.32.0` | Requisito de los gestos de retroceso del stack |
| `@expo/vector-icons` | `^15.0.2` | Iconografía (D-009); viene con Expo |

`react-native-safe-area-context@~5.7.0` ya está instalado desde la feature 001 y es también
requisito de Expo Router.

No se añade `react-native-reanimated`: los paneles usan `Animated` de React Native (D-004).
