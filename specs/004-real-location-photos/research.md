# Research: Real Location Photos

## R-001 — Componente de renderizado de imagen

**Decisión**: usar el componente `Image` de `react-native` (ya presente vía React Native, sin
instalar nada nuevo), pasándole directamente el valor que devuelve `imageRegistry.resolve()`
como prop `source`.

**Rationale**: `imageRegistry.resolve()` (`src/platform/images/registry.ts`) devuelve siempre
el resultado de un `require('...jpg')` — un módulo de asset local resuelto estáticamente por
Metro — o `null`. El componente `Image` de React Native acepta ese tipo de fuente
(`ImageSourcePropType`) de forma nativa desde siempre; no hay carga remota, caché de red,
placeholder-mientras-carga con crossfade, ni redimensionado bajo demanda que resolver, porque
todas las imágenes de esta entrega están empaquetadas en el binario. Ninguno de los beneficios
distintivos de una librería de imágenes de terceros (caché de disco/memoria para URLs remotas,
decodificación progresiva, `blurhash`) aplica a una fuente `require()` local.

La constitución (Restricciones Tecnológicas) es explícita: "se prefiere una API de la
plataforma a una dependencia, y una dependencia mantenida a una abandonada. Añadir una
dependencia nueva requiere justificarla en el PR." No hay justificación que dar aquí: `Image`
resuelve el caso de uso completo.

**Alternatives considered**:

- **`expo-image`**: el reemplazo recomendado por Expo para `Image`, con mejor caché de disco y
  soporte de `blurhash`/`placeholder` para imágenes remotas. Descartada porque esta entrega no
  tiene ninguna imagen remota — todo el catálogo de fotos vive en `assets/content/photos/` y se
  empaqueta con `require()` — así que la ventaja principal de `expo-image` no aplica, y
  añadirla sería una dependencia sin caso de uso que la justifique. Si una feature futura sirve
  fotos desde Firebase Storage (mencionado como fuente de contenido remota en la constitución,
  sección Restricciones Tecnológicas → Datos), esa sería la ocasión de reevaluar esta decisión,
  no esta.
- **Componente propio con `<canvas>` o gestión manual de bitmap**: sin sentido para una fuente
  ya resuelta por Metro; sería reinventar lo que `Image` ya hace.

## R-002 — Punto de recaída ante `resolve()` nulo

**Decisión**: la recaída a `ImagePlaceholder` vive dentro del componente nuevo
(`LocationImage`), no repetida en cada pantalla que lo usa.

**Rationale**: FR-004 exige el mismo comportamiento de recaída en las tres pantallas. Colocar
el `if (source === null) return <ImagePlaceholder />` dentro de `LocationImage` es la única
forma de que no se pueda olvidar en un cuarto sitio futuro, y es coherente con cómo el
proyecto ya centraliza decisiones repetidas (p. ej. `viewLocation` centraliza la decisión de
acceso en vez de dejarla repetida por pantalla, principio VI).

**Alternatives considered**:

- **Hook `useLocationImage(ref)` que devuelve la fuente o `null`, dejando el `if` en cada
  pantalla**: descartado porque tres copias del mismo condicional es exactamente el patrón que
  el principio I pide evitar ("una regla... filtrada dentro de un componente, es una
  violación"), aunque aquí sea una regla de presentación y no de dominio — el mismo espíritu de
  no duplicar aplica.

## R-003 — Forma de la prop nueva en `ListCard`

**Decisión**: `ListCard` gana una prop opcional `image?: ImageRef`. Si se omite, se comporta
exactamente igual que hoy (usa `ImagePlaceholder` directamente, sin pasar por
`imageRegistry.resolve()`).

**Rationale**: `ListCard` es un componente compartido sin conocimiento de dominio — no importa
`imageRegistry` para leerlo él mismo por `id`, hace falta que quien la llama (que ya tiene la
`Location` completa) le pase la referencia. Hacerla opcional evita romper cualquier llamador
existente o futuro que no tenga todavía una imagen que ofrecer, y evita que `ListCard`
adquiera una dependencia obligatoria del tipo `ImageRef` del núcleo de contenido cuando hoy es
agnóstica de esa forma de datos.

**Alternatives considered**:

- **`ListCard` recibe `locationId: string` y resuelve internamente vía `imageRegistry`**:
  descartada porque acoplaría un componente de presentación genérico (usado hoy para
  localizaciones, pero nombrado sin esa suposición) a la forma exacta de las claves de
  localización, y porque el llamador ya tiene la `ImageRef` completa (`thumbnail`) sin coste
  adicional de buscarla.

## R-004a — `LocationImage` acepta el resolver como prop opcional

**Decisión**: `LocationImage` recibe una prop opcional `resolver: ImageResolver` que por
defecto es `imageRegistry` (el de `src/platform/images/registry.ts`). Las tres pantallas de
producción no la pasan nunca — usan el valor por defecto — y solo el test de recaída (R-004)
la sustituye por un resolver falso.

**Rationale**: es el mismo patrón que ya usa el proyecto para poder falsear un puerto de
plataforma en tests (`EntitlementProvider`, `StoresProvider`) sin necesitar mockear el módulo
de `imageRegistry` con `jest.mock`. Como `ImageResolver` ya es una interfaz definida en el
núcleo (`src/core/content/images.ts`) pensada exactamente para esto — "lo que el núcleo
necesita de la plataforma para mostrar una imagen" —, inyectarla es coherente con el principio
I sin inventar mecanismo nuevo.

**Alternatives considered**:

- **`jest.mock('.../registry.ts')`**: descartado porque acopla el test a la ruta del módulo y
  es más frágil ante refactors que una prop explícita.

## R-005 — La prop se llama `imageRef`, no `ref`

**Decisión**: la prop de `LocationImage` que recibe la `ImageRef` se llama `imageRef`, corregido
durante la implementación desde el nombre `ref` con el que se documentó inicialmente en
data-model.md y contracts/location-image.md.

**Rationale**: aunque React 19 permite pasar `ref` como prop ordinaria a un componente función
sin `forwardRef`, la regla de lint `react-hooks/refs` de este proyecto (`expo lint`) sigue
tratando cualquier atributo JSX llamado `ref` como una referencia real y lo rechaza —
además, en el caso concreto de `LockedSheet.tsx` ese falso positivo se propagó a líneas JSX
vecinas no relacionadas (`Cannot access ref value during render` en un `Text` sin ningún ref),
lo que habría dejado el lint en rojo en cada pantalla que usara `LocationImage`. Reutilizar el
nombre `ref` para una prop de datos es además una fuente de confusión aunque el compilador lo
permitiera: quien lea `<LocationImage ref={...} />` esperaría razonablemente una referencia al
nodo, no un dato de dominio.

**Alternatives considered**:

- **Mantener `ref` y silenciar la regla de lint por línea**: descartado — la constitución
  prohíbe silenciar errores de tipo con `@ts-ignore` sin justificar, y el mismo espíritu aplica
  a silenciar una regla de lint del proyecto para evitar renombrar una prop.

## R-004 — Cobertura de test

**Decisión**: dos niveles, porque el catálogo real no ofrece ningún caso natural de "imagen
ausente" con el que ejercitar FR-004 de punta a punta.

1. **Caso positivo, de aceptación, por pantalla**: extender los tests existentes
   (`location-detail.test.tsx`, `locked-sheet.test.tsx`, `saved.test.tsx`,
   `tip-detail.test.tsx`) para comprobar que la imagen real de una localización del catálogo
   (p. ej. Templo de Debod, que tiene `thumb.jpg` y `detail.jpg` empaquetados) es la que se ve
   al abrir esa pantalla.
2. **Caso de recaída, de componente**: un test dedicado de `LocationImage` (React Native
   Testing Library) que le pasa un `resolver: ImageResolver` inyectado que devuelve `null`, y
   comprueba que renderiza `ImagePlaceholder`. Es el único punto donde ese comportamiento se
   puede provocar de forma determinista, porque las 14 localizaciones reales del catálogo
   siempre tienen su miniatura empaquetada (D-010 generó las 18 `thumb.jpg`/`detail.jpg`
   precisamente para que `validate:catalog` nunca falle), así que no existe hoy una
   localización real sin imagen resoluble con la que forzar el caso por una pantalla completa.

**Rationale**: el principio III pide tests de aceptación end-to-end para el comportamiento de
usuario, pero también permite — y aquí exige — una prueba centrada cuando el escenario no es
alcanzable con datos reales. `LocationImage` es un componente pequeño y puro (una decisión:
¿hay fuente o no?), así que probarlo con un resolver falso no es "inspeccionar estado interno":
es interactuar con su única prop pública tal y como lo haría cualquier pantalla que lo use, con
la única diferencia de que la fuente de datos se falsea porque el catálogo real no tiene el
caso límite.

**Alternatives considered**:

- **Solo tests de aceptación por pantalla, sin test de componente**: descartado porque dejaría
  FR-004 (recaída a `ImagePlaceholder`) sin ejercitar en ninguna de las tres pantallas, al no
  existir hoy una localización real con imagen ausente del registro.
- **Añadir una localización de prueba sin imagen al catálogo real para forzar el caso en cada
  pantalla**: descartado por más invasivo — contaminaría el catálogo de producción con datos
  de test y volvería a disparar el mismo problema que documentó D-010 (el validador exige
  imagen para toda localización declarada).
