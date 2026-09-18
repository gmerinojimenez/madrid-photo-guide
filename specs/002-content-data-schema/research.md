# Research: Catálogo de contenido de la guía y almacén de imágenes

**Feature**: 002-content-data-schema | **Fecha**: 2026-09-18

Decisiones técnicas previas al diseño. Cada una resuelve una incógnita del Technical Context
de [plan.md](./plan.md).

---

## D-001 — Un único fichero de catálogo, no uno por localización

**Decisión**: todo el contenido vive en `src/content/catalog.json`, un único fichero JSON
versionado en el repositorio e importado estáticamente.

**Rationale**: Metro, el empaquetador de React Native, resuelve `import`/`require` de forma
estática en tiempo de build. Un directorio de ficheros por localización obligaría a mantener
a mano un índice de imports, que es exactamente el trabajo manual que la feature quiere
eliminar (FR-005). Con un único fichero, añadir una localización es editar un array. A 60
localizaciones el fichero ronda los 120 KB de JSON, que se parsea en pocos milisegundos y
cabe de sobra en memoria.

El núcleo recibe el catálogo **ya parseado** como argumento, no lo importa él: así la
decisión de dónde vive el JSON es reversible sin tocar dominio, que es lo que hará falta
cuando el origen pase a ser remoto.

**Alternativas descartadas**:

- *Un JSON por localización*: mejor para revisar diffs, pero exige índice manual de imports y
  complica la validación cruzada (referencias de tips a localizaciones).
- *Fichero por idioma* (`catalog.es.json`, `catalog.en.json`): duplica la estructura completa
  para traducir solo los textos, y las dos copias divergen en cuanto alguien añade un campo.
  Ver D-005.

---

## D-002 — Zod para parsear y validar el catálogo

**Decisión**: validar el catálogo con Zod (`zod@4.6.5`, versión comprobada hoy en el
registro), definiendo el esquema una sola vez en el núcleo y derivando de él los tipos de
TypeScript con `z.infer`.

**Rationale**: la spec pide tres comportamientos que un validador ad-hoc reimplementaría mal:
ignorar campos desconocidos sin fallar (FR-034), descartar solo las piezas inválidas
conservando el resto (FR-035) y dejar constancia de lo descartado. Zod los da de serie:
los objetos ignoran claves desconocidas por defecto, y `safeParse` devuelve el error en lugar
de lanzarlo, lo que permite recorrer el array descartando elemento a elemento.

Derivar los tipos del esquema elimina la deriva entre "lo que valido" y "lo que declaro que
tengo", que es el fallo clásico de JSON Schema con tipos escritos a mano. Es TypeScript puro,
sin módulos nativos, y corre en Node sin simulador: cumple el principio I.

**Justificación de la dependencia** (exigida por la constitución): es la única dependencia
nueva de la feature. Sin ella, el parseo defensivo de ~10 entidades se escribe a mano y hay
que probarlo aparte. Si el tamaño del bundle llegara a importar, `zod/mini` ofrece la misma
semántica con una API más verbosa y menos peso; se puede cambiar después sin tocar el
dominio, porque el esquema está confinado a un módulo.

**Alternativas descartadas**:

- *ajv + JSON Schema*: obliga a mantener el esquema y los tipos por separado, o a generar
  tipos en un paso de build. Además ajv usa `eval`/`new Function` para compilar validadores,
  lo que choca con el motor JS de React Native en modo release.
- *Validador a mano*: cero dependencias, pero ~400 líneas de código defensivo repetitivo que
  hay que mantener y probar cada vez que crece el esquema.
- *TypeScript solo*: no vale. Los tipos desaparecen en runtime y el catálogo es un dato
  externo que puede llegar mal formado; el principio de degradación elegante exige validación
  real.

---

## D-003 — Almacén de imágenes: convención por identificador + registro estático

**Decisión**:

- Los JPG viven en `assets/content/photos/<locationId>/<uso>.jpg`, con `<uso>` ∈
  {`thumb`, `detail`}.
- El catálogo referencia imágenes por `locationId` + uso, nunca por ruta (FR-023).
- Un registro fuera del núcleo (`src/platform/images/registry.ts`) traduce esa referencia a
  un módulo de imagen mediante `require` estáticos, y el núcleo lo consume tras la interfaz
  `ImageResolver`.

**Rationale**: Metro necesita rutas literales en `require` para incluir un asset en el
bundle; no existe `require(variable)`. Un registro con entradas literales es la única forma
de cumplir a la vez "referencia por identificador" y "empaquetado estático". Al vivir fuera
del núcleo, el dominio no importa nada de React Native (principio I), y cuando las imágenes
pasen a servirse desde Firebase Storage basta con una segunda implementación de la misma
interfaz: la ruta remota es `content/photos/<locationId>/<uso>.jpg`, idéntica a la local, así
que ninguna referencia del catálogo cambia (FR-028).

**Nota constitucional importante**: la constitución prohíbe almacenar en el dispositivo
contenido premium no adquirido. Empaquetar en el binario las imágenes en detalle de las 60
localizaciones lo incumpliría. Por eso el almacén local **solo** contiene imágenes en detalle
de localizaciones gratuitas, más miniaturas (que son públicas por FR-025). Las imágenes en
detalle de pago llegarán del origen remoto cuando exista titularidad. La semilla de esta
feature son 5 localizaciones gratuitas, así que el problema no se materializa hoy, pero la
convención ya lo contempla y la validación lo comprueba.

**Alternativas descartadas**:

- *Rutas literales en el JSON*: rompe FR-023 y ata el contenido al layout del repositorio.
- *Un solo JPG por localización*: el diseño necesita miniatura para el mapa y foto en detalle
  a pantalla completa, y la miniatura es lo único que puede ver quien no ha comprado.
- *Imágenes en base64 dentro del JSON*: infla el catálogo, impide la caché de imágenes del
  sistema y rompe el parseo incremental.

---

## D-004 — El desenfoque del bloqueo se aplica en cliente

**Decisión** (cerrada por el usuario): no se almacena ninguna variante desenfocada. La
miniatura se guarda nítida y en baja resolución, y la capa de presentación aplica el
desenfoque cuando la localización está bloqueada.

**Rationale**: una variante desenfocada sería un tercer fichero por localización con la única
función de ser fea, y dejaría el efecto congelado en el contenido en lugar de en el diseño.
Al hacerlo en cliente, cambiar la intensidad del desenfoque es un cambio de UI sin tocar
datos ni volver a generar imágenes. La miniatura ya es de baja resolución (FR-025), que es lo
que protege de verdad: aunque alguien la extraiga del bundle, no sustituye a la foto.

**Consecuencia para esta feature**: ninguna, salvo no crear el recurso. El desenfoque es
presentación y no entra aquí, que no entrega pantallas. Se deja anotado para la feature de
UI que la propiedad `blurRadius` del componente de imagen cubre el caso sin dependencias
nuevas.

**Alternativa descartada**: *miniatura pre-desenfocada servida al usuario sin compra*. Sería
más resistente a la extracción del asset, pero la miniatura ya es deliberadamente pobre y el
coste —un fichero más por localización, regenerable solo con herramientas— no compensa.

---

## D-005 — Textos localizados en el propio nodo, español obligatorio

**Decisión**: cada texto visible es un objeto `{ "es": "…", "en"?: "…" }`. El núcleo expone
una función `localize(text, locale)` que devuelve el idioma pedido o cae al español.

**Rationale**: mantiene juntos el dato y sus traducciones, así que añadir un campo no obliga
a tocar varios ficheros ni deja huecos silenciosos. El español obligatorio en el tipo hace
que la ausencia de base sea un error de validación y no un texto vacío en pantalla (FR-037,
FR-038). Esta feature solo entrega español; la estructura ya admite inglés sin migración.

**Alternativas descartadas**:

- *Fichero por idioma*: ver D-001.
- *Claves de i18n con catálogo aparte* (`loc.debod.desc`): es el patrón correcto para la copia
  de interfaz, pero para contenido editorial separa el texto de su ficha y hace imposible
  revisar una localización de un vistazo.

---

## D-006 — La vista previa es un tipo distinto, no un objeto con campos vacíos

**Decisión**: el núcleo expone dos tipos, `LocationPreview` y `Location`, y una única función
que proyecta el segundo en el primero. Lo que devuelve la capa de acceso para un usuario sin
compra es un `LocationPreview`, que **estructuralmente no tiene** los campos de pago.

El catálogo declara además la lista de campos reservados (FR-031/FR-032) y un test comprueba
que esa lista y la proyección del núcleo coinciden. La lista en datos es la fuente de verdad
documental; la proyección tipada es la que hace imposible el error en tiempo de compilación.

**Rationale**: si la vista previa fuese el mismo tipo con campos opcionales a `undefined`,
cualquier pantalla podría leer `location.coords` sin que el compilador dijera nada, y la fuga
solo se detectaría en un test que alguien recuerde escribir. Con tipos distintos, acceder a
un campo de pago desde una vista previa no compila. Es la forma más barata de cumplir el
principio VI ("ninguna pantalla replica la decisión de acceso").

**Alternativas descartadas**:

- *Campos opcionales en un único tipo*: fuga silenciosa, descrito arriba.
- *Proyección puramente dirigida por datos, sin tipos*: cumple FR-031 al pie de la letra pero
  devuelve `Record<string, unknown>` y tira por tierra el modo estricto de TypeScript.
- *Filtrar en la capa de UI*: prohibido explícitamente por la constitución.

---

## D-007 — Etiquetas múltiples con vocabulario declarado en el catálogo

**Decisión** (cerrada por el usuario): una localización declara `tagIds: string[]` con una o
más etiquetas. El catálogo declara el vocabulario disponible (`id`, etiqueta presentable,
orden) en un único sitio. El filtro por etiqueta acepta una localización si **cualquiera** de
sus etiquetas coincide (FR-010b).

**Rationale**: una foto puede ser a la vez callejera y nocturna, y forzar una sola
clasificación obligaría a elegir mal o a inventar etiquetas compuestas. Declarar el
vocabulario en datos permite renombrar "calle" como "callejera" sin tocar código, y da a la
UI el orden de los chips del filtro.

Una etiqueta desconocida en una localización no la invalida: se conserva y se ignora al
filtrar. Una localización sin ninguna etiqueta es un aviso de validación, no un error: sigue
siendo visible y buscable.

**Alternativas descartadas**:

- *Etiqueta única* (el modelo del prototipo): es lo que el usuario ha descartado.
- *Texto libre sin vocabulario*: imposible construir los chips del filtro ni garantizar
  coherencia editorial entre 60 fichas.

---

## D-008 — Contenido semilla tomado del prototipo de diseño

**Decisión**: las 5 localizaciones gratuitas y los 5 consejos del catálogo semilla reutilizan
el contenido ficticio del prototipo "Madrid Photo Guide": Templo de Debod, Puerta de Europa,
Cuatro Torres, Puerta del Sol y Plaza Mayor; consejos del Faro de Moncloa, Mercado de la
Cebada, dónde dormir, abono de transporte y el Rastro.

**Rationale**: es contenido que el usuario ya ha revisado y aprobado visualmente, con el tono
editorial correcto y la longitud realista para los layouts. Inventar textos distintos sería
trabajo duplicado y descuadraría las pantallas cuando se construyan.

**Nota**: sigue siendo contenido de maqueta. Los parámetros de captura y los datos prácticos
son verosímiles pero no verificados, y las coordenadas son aproximadas al lugar real.

---

## D-009 — Imágenes de marcador generadas, no fotografías reales

**Decisión**: los 10 JPG de la semilla (5 localizaciones × miniatura + detalle) son
rectángulos neutros generados, con el nombre de la localización visible, a 400×300 (miniatura)
y 1600×1200 (detalle).

Se generan una sola vez con un script local sin dependencias: Python de la librería estándar
escribe un PNG (`zlib` + `struct`) y `sips`, incluido en macOS, lo convierte a JPEG. Los JPG
resultantes se versionan; CI no regenera nada.

**Rationale**: el proyecto no tiene fotografías todavía y la feature necesita ficheros reales
para que la resolución de imágenes se pueda probar de verdad. Generarlos sin añadir
dependencias de tratamiento de imagen (`sharp`, `jimp`) mantiene el `package.json` limpio,
y al estar versionados el pipeline no depende de macOS.

**Alternativas descartadas**:

- *`sharp` o `jimp` como devDependency*: una dependencia pesada, con binarios nativos, para
  generar diez ficheros una sola vez.
- *Fotos reales de bancos de imágenes*: licencias que revisar para contenido que se va a
  tirar.
- *Sin imágenes, solo referencias*: la validación de imágenes ausentes (FR-033) no se podría
  probar en positivo.

---

## D-010 — Alcance de las pruebas: sin pantallas, aceptación sobre la API pública

**Decisión**: los tests de aceptación de esta feature ejercitan la API pública del núcleo
extremo a extremo —cargar el `catalog.json` real, resolver imágenes contra el registro real,
proyectar vistas previas— en lugar de renderizar pantallas con React Native Testing Library.

**Rationale**: la constitución exige tests de aceptación que ejerciten el escenario de usuario
de la spec. Aquí el usuario es el desarrollador y los escenarios son de datos: la feature no
entrega ninguna pantalla que renderizar. Renderizar una pantalla ficticia solo para satisfacer
la letra de la norma produciría un test que no prueba nada real. La sustitución queda
registrada en Complexity Tracking de [plan.md](./plan.md), y la primera feature de UI que
consuma este catálogo sí traerá sus tests con RNTL.

**Alternativa descartada**: *pantalla de prueba desechable*. Código que nace muerto, y que
habría que borrar en la siguiente feature.
