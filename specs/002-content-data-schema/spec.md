# Feature Specification: Catálogo de contenido de la guía y almacén de imágenes

**Feature Branch**: `002-content-data-schema`

**Created**: 2026-09-18

**Status**: Draft

**Input**: User description: "as a developer, quiero tener una forma de gestionar los datos que mostrará mi aplicación (fotos, información de las fotos, tips generales, etc...) diseña una estructura, probablemente un Json para almacenar todos esos datos, empezando con 5 fotos de prueba (inventa tú el contenido ya que son mockups) y una forma de almacenar los JPG"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Describir el contenido de la guía en un catálogo único (Priority: P1)

Como desarrollador del proyecto, quiero declarar en un único catálogo estructurado todas
las piezas de contenido de la guía —cada localización fotográfica con su ficha, sus
consejos y su marca de acceso— para poder añadir, corregir o retirar contenido editando
datos, sin tocar ni una línea de lógica de la aplicación.

**Why this priority**: sin una fuente de contenido no hay nada que mostrar. Todas las
pantallas de la guía (listado, ficha, mapa, buscador) se alimentan de esta estructura, y
cualquier decisión que se tome aquí condiciona el resto del producto. Es la primera unidad
de valor después del esqueleto de la app.

**Independent Test**: se parte del catálogo de prueba con sus cinco localizaciones, se
añade una sexta editando solo datos, y se comprueba que la aplicación la ofrece con su
ficha completa sin cambios de código. No depende de ninguna otra historia.

**Acceptance Scenarios**:

1. **Given** un catálogo con cinco localizaciones fotográficas, **When** la aplicación
   carga el contenido, **Then** las cinco quedan disponibles con su nombre, descripción de
   la toma, ubicación, parámetros de captura y marca de acceso.
2. **Given** el catálogo cargado, **When** se solicita una localización por su
   identificador, **Then** se obtiene esa localización y solo esa, de forma estable entre
   ejecuciones.
3. **Given** un catálogo al que se le añade una nueva localización sin modificar código,
   **When** la aplicación vuelve a cargar el contenido, **Then** la nueva localización
   aparece junto a las anteriores sin alterarlas.
4. **Given** dos localizaciones que comparten el mismo identificador, **When** se valida el
   catálogo, **Then** la validación falla señalando el identificador duplicado.

---

### User Story 2 - Guardar y resolver las imágenes de cada localización (Priority: P1)

Como desarrollador del proyecto, quiero un lugar y una convención únicos donde depositar
los JPG de cada localización, y que el catálogo se refiera a ellos por identificador en
lugar de por ruta, para que las imágenes puedan cambiar de sitio —del repositorio al
almacenamiento remoto— sin reescribir el contenido.

**Why this priority**: una guía fotográfica sin imágenes no es una guía. Además, la
decisión de cómo se referencian las imágenes es la que determina si el contenido puede
migrarse después a origen remoto sin rehacerlo, así que debe tomarse a la vez que el
catálogo.

**Independent Test**: se deposita un JPG siguiendo la convención, se declara su
identificador en el catálogo, y se comprueba que la aplicación lo muestra en la ficha
correspondiente. Se prueba con las cinco localizaciones de prueba.

**Acceptance Scenarios**:

1. **Given** una localización con una imagen declarada y presente en el almacén, **When**
   se abre su ficha, **Then** se muestra la imagen correspondiente a esa localización.
2. **Given** una localización cuya imagen declarada no existe en el almacén, **When** se
   valida el catálogo, **Then** la validación falla indicando la localización y la imagen
   que falta.
3. **Given** una imagen presente en el almacén que ninguna localización declara, **When**
   se valida el catálogo, **Then** la validación advierte del recurso huérfano.
4. **Given** una ficha abierta sin conectividad, **When** su imagen ya está disponible en
   el dispositivo, **Then** se muestra igualmente.

---

### User Story 3 - Publicar consejos generales independientes de una localización (Priority: P2)

Como desarrollador del proyecto, quiero declarar consejos generales sobre Madrid —qué ver,
dónde comer, dónde dormir y cómo moverse— agrupados por tema y dentro del mismo catálogo,
para poder ofrecer una sección de guía, siempre gratuita, que no dependa de ninguna
localización concreta.

**Why this priority**: aporta valor real al usuario y es parte del producto prometido,
pero la app es demostrable y útil con solo las localizaciones. Puede entregarse después
sin bloquear nada.

**Independent Test**: se declaran varios consejos generales en distintas categorías y se
comprueba que la aplicación los ofrece agrupados por categoría, sin necesidad de que
exista ninguna localización.

**Acceptance Scenarios**:

1. **Given** un catálogo con consejos generales en varias categorías, **When** la
   aplicación carga el contenido, **Then** los consejos quedan disponibles agrupados por
   su categoría y en un orden estable.
2. **Given** un consejo general asociado a una categoría desconocida, **When** se carga el
   contenido, **Then** el consejo se conserva bajo una categoría genérica y la aplicación
   no falla.

---

### User Story 4 - Distinguir contenido gratuito de contenido de pago desde los datos (Priority: P2)

Como desarrollador del proyecto, quiero que cada pieza de contenido declare en el propio
catálogo si es gratuita o de pago, para que la regla de qué se desbloquea con la compra
viva en datos y no repartida en condicionales por las pantallas.

**Why this priority**: el modelo de negocio del proyecto exige que las reglas de acceso
vivan en datos. Hacerlo desde el primer catálogo evita una migración de contenido después,
pero no bloquea la construcción de las pantallas.

**Independent Test**: se marca parte del contenido de prueba como gratuito y parte como de
pago, y se comprueba que la clasificación resultante coincide exactamente con lo declarado,
incluyendo el caso de una pieza sin marca legible.

**Acceptance Scenarios**:

1. **Given** una pieza de contenido marcada como gratuita, **When** se consulta su
   clasificación de acceso, **Then** se clasifica como gratuita.
2. **Given** una pieza de contenido marcada como de pago, **When** se consulta su
   clasificación de acceso, **Then** se clasifica como de pago.
3. **Given** una pieza de contenido sin marca de acceso, o con una marca no reconocida,
   **When** se consulta su clasificación, **Then** se clasifica como de pago.

---

### User Story 5 - Servir una vista previa de las localizaciones de pago (Priority: P2)

Como desarrollador del proyecto, quiero que cada localización de pago exponga un subconjunto
reducido de su información —nombre, barrio, etiquetas, zona aproximada y una miniatura de
baja resolución— para que aparezca en el mapa y en el buscador de un usuario que aún no ha
comprado, sin revelar nada de lo que se paga.

**Why this priority**: es lo que convierte el mapa en un escaparate y sostiene la conversión
a la compra. No bloquea la construcción del contenido gratuito, pero define la frontera del
modelo de datos: el acceso no es por ficha entera, sino por campo.

**Independent Test**: se consulta una localización de pago como usuario sin compra y se
comprueba, campo a campo, que se obtiene exactamente el subconjunto de vista previa y ningún
campo reservado. Se repite el mismo caso como usuario con compra y se obtiene la ficha
completa.

**Acceptance Scenarios**:

1. **Given** una localización de pago y un usuario sin compra, **When** se solicita esa
   localización, **Then** se obtienen su nombre, su barrio, sus etiquetas, su zona
   aproximada y su recurso de vista previa, y ningún otro campo.
2. **Given** una localización de pago y un usuario sin compra, **When** se solicita esa
   localización, **Then** NO se obtienen sus coordenadas exactas, sus parámetros de captura,
   su descripción de toma ni su imagen en detalle.
3. **Given** la misma localización y un usuario con la compra hecha, **When** se solicita,
   **Then** se obtiene la ficha completa con todos sus campos.
4. **Given** una localización gratuita, **When** se solicita sin compra, **Then** se obtiene
   su ficha completa.
5. **Given** una localización de pago sin recurso de vista previa declarado, **When** se
   solicita sin compra, **Then** se obtiene el resto de la vista previa sin imagen, y la
   validación del catálogo lo advierte.

---

### Edge Cases

- **Campos desconocidos**: un catálogo que incluye campos que esta versión de la
  aplicación no conoce se carga igualmente, ignorando lo desconocido y sin fallar.
- **Campos ausentes opcionales**: una localización sin consejos, sin etiquetas o sin
  dirección postal se muestra con la información que sí tiene, sin huecos que rompan la
  presentación.
- **Campos obligatorios ausentes**: una pieza sin identificador, sin título o sin imagen
  principal se considera inválida; se descarta esa pieza y el resto del catálogo sigue
  siendo utilizable.
- **Catálogo ilegible o corrupto**: si el contenido no puede interpretarse, la aplicación
  informa del problema y no se cierra.
- **Versión de esquema futura**: un catálogo declarado con una versión de esquema mayor que
  la soportada no se carga a ciegas; la aplicación lo detecta y degrada con un mensaje en
  lugar de interpretar mal los datos.
- **Coordenadas fuera de rango o ausentes**: una localización con coordenadas inválidas se
  sigue mostrando en listado y ficha, pero no se ofrece en funciones de mapa o navegación.
- **Texto en un idioma no disponible**: si falta la traducción de un texto, se muestra el
  idioma base en lugar de un hueco vacío.
- **Identificadores duplicados**: dos piezas con el mismo identificador se detectan en
  validación y bloquean la publicación del catálogo.
- **Parámetros de captura incompletos**: una localización que solo declara algunos
  parámetros (por ejemplo focal e ISO, sin cámara) muestra los que tiene, sin huecos ni
  valores inventados.
- **Etiqueta o categoría fuera de vocabulario**: una etiqueta desconocida en una
  localización se conserva y se ignora al filtrar, sin invalidar el resto de sus etiquetas;
  una localización sin ninguna etiqueta sigue siendo visible y buscable, pero no aparece bajo
  ningún filtro; un consejo con categoría desconocida se conserva bajo una categoría
  genérica.
- **Consejo que apunta a una localización inexistente**: la referencia rota se ignora al
  presentar el consejo, y la validación la señala antes de publicar.
- **Localización de pago sin miniatura de vista previa**: se sigue mostrando en el mapa con
  su nombre, barrio y tipo, sin imagen, y la validación lo advierte.
- **Localización de pago sin zona aproximada**: no se sitúa en el mapa para un usuario sin
  compra; nunca se recurre a las coordenadas exactas como sustituto.

## Requirements *(mandatory)*

### Functional Requirements

#### Catálogo

- **FR-001**: El sistema DEBE describir todo el contenido de la guía en un único catálogo
  estructurado, legible y editable a mano, versionado junto al proyecto.
- **FR-002**: El catálogo DEBE declarar su versión de esquema y la fecha de su última
  actualización.
- **FR-003**: El catálogo DEBE contener, como mínimo, dos colecciones: localizaciones
  fotográficas y consejos generales.
- **FR-004**: Cada pieza de contenido DEBE tener un identificador estable, único dentro de
  su colección, que no cambie cuando cambien sus textos.
- **FR-005**: El sistema DEBE permitir añadir, modificar o retirar contenido editando
  únicamente el catálogo, sin cambios en la lógica de la aplicación.
- **FR-006**: El catálogo DEBE incluir un conjunto inicial de cinco localizaciones
  fotográficas de prueba, con contenido ficticio completo y realista, marcadas como
  gratuitas, y al menos cinco consejos generales repartidos entre sus categorías.

#### Ficha de una localización

- **FR-007**: Cada localización DEBE declarar título, descripción, imagen principal y marca
  de acceso.
- **FR-008**: Cada localización DEBE declarar coordenadas geográficas exactas del punto de
  disparo, y una zona aproximada mostrable sin revelar ese punto.
- **FR-009**: Cada localización DEBE declarar el barrio al que pertenece, y cada barrio DEBE
  poder tener su propia descripción reutilizable entre las localizaciones que contiene.
- **FR-010**: Cada localización DEBE declarar una o varias etiquetas que describan el tipo
  de fotografía que ofrece (por ejemplo "callejera" y "nocturna" a la vez). Las etiquetas
  disponibles, con su nombre presentable y su orden, se declaran en el propio catálogo.
- **FR-010b**: El filtrado por etiqueta DEBE devolver una localización cuando cualquiera de
  sus etiquetas coincide con la seleccionada.
- **FR-011**: Cada localización DEBE poder declarar el mejor momento para la toma, expresado
  en lenguaje natural (por ejemplo "45 min antes del atardecer", "noche cerrada").
- **FR-012**: Cada localización DEBE poder declarar los parámetros de captura de su
  fotografía de referencia, cada uno por separado y todos opcionales: cámara, distancia
  focal, apertura, velocidad de obturación y sensibilidad ISO.
- **FR-013**: Cada localización DEBE poder declarar una descripción de la toma (cómo y desde
  dónde se consigue la fotografía).
- **FR-014**: Cada localización DEBE poder declarar una o varias imágenes adicionales
  además de la principal.
- **FR-015**: El sistema DEBE permitir buscar localizaciones por nombre, por barrio y por
  etiqueta, y filtrarlas por etiqueta y por distancia al usuario.
- **FR-016**: La distancia a una localización NO se almacena en el catálogo: se calcula a
  partir de las coordenadas y de la posición del usuario.

#### Consejos generales

- **FR-017**: Cada consejo general DEBE declarar identificador, categoría, título, una línea
  de contexto breve (precio, horario o zona) y un cuerpo de uno o varios párrafos.
- **FR-018**: La categoría de un consejo general DEBE tomarse de un vocabulario cerrado y
  declarado en los datos (hoy: ver, comer, dormir, transporte), usado como filtro.
- **FR-019**: Cada consejo general DEBE poder referenciar las localizaciones con las que se
  relaciona, para ofrecerlas como salto desde su ficha.
- **FR-020**: Los consejos generales SON siempre gratuitos y no llevan marca de acceso: el
  producto de pago son las localizaciones.
- **FR-021**: El sistema DEBE ofrecer los consejos generales agrupados por categoría y en
  un orden estable y controlable desde los datos.

#### Imágenes

- **FR-022**: El sistema DEBE definir una única convención de almacenamiento para los
  ficheros JPG de la guía, de modo que la ubicación de la imagen de cualquier pieza sea
  deducible sin ambigüedad.
- **FR-023**: El catálogo DEBE referirse a las imágenes por identificador de recurso, nunca
  por ruta literal de fichero.
- **FR-024**: Cada localización DEBE declarar dos usos distintos de imagen: una miniatura
  para mapa y listados, y una imagen en detalle apta para verse a pantalla completa.
- **FR-025**: La miniatura de una localización de pago DEBE poder servirse a un usuario sin
  compra, en una resolución lo bastante baja como para no sustituir a la imagen en detalle.
  El catálogo NO almacena una variante desenfocada: el desenfoque del bloqueo es un efecto de
  presentación que aplica la aplicación sobre esa misma miniatura.
- **FR-026**: La imagen en detalle de una localización de pago NO DEBE descargarse ni
  almacenarse en el dispositivo de un usuario sin compra.
- **FR-027**: Cada imagen DEBE poder declarar metadatos de presentación: texto alternativo,
  relación de aspecto y crédito o autoría.
- **FR-028**: La convención de almacenamiento DEBE ser trasladable sin cambios al
  contenido cuando las imágenes pasen a servirse desde origen remoto.

#### Acceso y validación

- **FR-029**: Cada localización DEBE declarar explícitamente si es gratuita o de pago.
- **FR-030**: El sistema DEBE tratar como de pago cualquier localización sin marca de acceso
  legible o con una marca no reconocida.
- **FR-031**: El catálogo DEBE declarar, en datos y en un único sitio, qué campos de una
  localización forman su vista previa pública y cuáles quedan reservados a la compra. Ninguna
  pantalla puede decidir esa frontera por su cuenta.
- **FR-032**: Como mínimo DEBEN quedar reservados a la compra: coordenadas exactas,
  parámetros de captura, descripción de la toma, descripción del barrio e imagen en detalle.
- **FR-033**: El sistema DEBE ofrecer una validación del catálogo, ejecutable antes de
  publicar, que detecte: identificadores duplicados, campos obligatorios ausentes, imágenes
  declaradas que no existen, imágenes presentes que nadie declara, localizaciones de pago sin
  miniatura de vista previa, localizaciones sin ninguna etiqueta, etiquetas o categorías
  fuera de su vocabulario, y referencias de un consejo a localizaciones inexistentes.
- **FR-034**: El sistema DEBE ignorar los campos que no reconozca y continuar cargando el
  resto del catálogo, sin fallar.
- **FR-035**: El sistema DEBE descartar únicamente las piezas inválidas, conservando
  utilizable el resto del catálogo, y dejar constancia de lo descartado.
- **FR-036**: El sistema DEBE detectar un catálogo cuya versión de esquema sea posterior a
  la soportada y degradar con un aviso en lugar de interpretarlo.

#### Textos

- **FR-037**: Los textos visibles de cada pieza DEBEN poder expresarse en más de un idioma,
  con español como idioma base obligatorio.
- **FR-038**: El sistema DEBE recurrir al idioma base cuando falte la traducción de un
  texto en el idioma solicitado.

### Key Entities *(include if feature involves data)*

- **Catálogo de contenido**: raíz del contenido de la guía. Agrupa la versión de esquema,
  la fecha de actualización, los idiomas disponibles y las colecciones de localizaciones,
  consejos generales y recursos de imagen.
- **Localización fotográfica**: un lugar concreto de Madrid con interés fotográfico.
  Identificador estable, nombre, barrio, etiquetas, mejor momento, coordenadas exactas y
  zona aproximada, descripción de la toma, parámetros de captura, miniatura e imagen en
  detalle, imágenes adicionales y marca de acceso.
- **Parámetros de captura**: los valores con los que se tomó la fotografía de referencia —
  cámara, distancia focal, apertura, velocidad e ISO— cada uno independiente y opcional, para
  poder mostrarse como piezas sueltas en la ficha.
- **Etiqueta**: rasgo fotográfico de una localización (skyline, callejera, arquitectura,
  atardecer, nocturna…), con nombre presentable y orden de presentación. Una localización
  tiene varias; el catálogo declara el conjunto disponible en un único sitio.
- **Barrio**: zona de Madrid a la que pertenecen una o varias localizaciones. Tiene nombre y
  una descripción propia sobre qué ofrece la zona más allá de la foto.
- **Zona aproximada**: representación de la ubicación de una localización que basta para
  situarla en el mapa sin revelar el punto exacto de disparo.
- **Consejo general**: recomendación sobre Madrid no ligada a una localización concreta.
  Pertenece a una categoría, tiene título, línea de contexto, cuerpo, orden y referencias a
  localizaciones relacionadas. Siempre gratuito.
- **Categoría de consejos**: agrupación temática cerrada de los consejos generales (ver,
  comer, dormir, transporte), con nombre y orden de presentación.
- **Recurso de imagen**: un JPG de la guía, identificado de forma estable e independiente
  de su ubicación. Declara su uso (miniatura o detalle), texto alternativo, relación de
  aspecto y crédito.
- **Marca de acceso**: clasificación de una localización como gratuita o de pago, declarada
  en los datos y consumida por el módulo único de titularidad del proyecto.
- **Proyección de vista previa**: el subconjunto de campos de una localización que puede
  verse sin haber comprado. Se declara una vez en los datos y gobierna toda la aplicación.
- **Texto localizado**: un texto visible con una variante por idioma disponible y el
  español como variante obligatoria.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Añadir una localización nueva y completa a la guía se hace editando solo
  contenido, en menos de 10 minutos y sin modificar lógica de la aplicación.
- **SC-002**: El catálogo inicial ofrece 5 localizaciones con ficha completa y al menos 5
  consejos generales, y todas sus imágenes se muestran correctamente.
- **SC-003**: La validación del catálogo detecta el 100% de los casos de identificador
  duplicado, campo obligatorio ausente e imagen declarada inexistente, antes de publicar.
- **SC-004**: Un catálogo con campos desconocidos, con una pieza inválida o con una
  traducción ausente se carga sin que la aplicación falle, en el 100% de los casos
  probados.
- **SC-005**: Toda pieza sin marca de acceso legible se clasifica como de pago en el 100%
  de los casos probados.
- **SC-006**: El contenido y las imágenes ya disponibles en el dispositivo se consultan sin
  conectividad.
- **SC-007**: Trasladar el origen de las imágenes del repositorio al almacenamiento remoto
  no obliga a modificar ninguna referencia de imagen del catálogo.
- **SC-008**: Ningún campo reservado a la compra (coordenadas exactas, parámetros de
  captura, descripción de la toma, descripción del barrio, imagen en detalle) es obtenible
  para una localización de pago sin compra, en el 100% de los casos probados.
- **SC-009**: El catálogo soporta las 60 localizaciones previstas del producto sin cambios
  de esquema, de las cuales 5 son gratuitas.

## Assumptions

- **Formato**: se asume el formato JSON para el catálogo, tal y como indica la petición.
  La elección concreta de ficheros, esquema y herramienta de validación corresponde al plan.
- **Origen del contenido en esta feature**: el catálogo y las imágenes se empaquetan con la
  aplicación y se versionan en el repositorio. El origen remoto que establece la
  constitución del proyecto queda fuera de alcance aquí; esta feature es el esquema y el
  contenido semilla sobre el que aquella se construirá, y por eso FR-028 exige que la
  convención de imágenes sea trasladable.
- **Contenido ficticio**: las cinco localizaciones y los consejos iniciales son maquetas.
  Sus textos, consejos y créditos son inventados y no pretenden ser información verificada
  ni fotografías reales; se sustituirán por contenido editorial definitivo más adelante.
- **Idiomas**: se asume español como idioma base y estructura preparada para añadir inglés,
  aunque esta feature solo entrega los textos en español. No se traducen los identificadores
  ni las etiquetas internas.
- **Reparto gratuito/pago del contenido semilla**: se asume que parte de las localizaciones
  de prueba se marcan como gratuitas y parte como de pago, para poder ejercitar ambos
  caminos. El reparto definitivo del producto es una decisión editorial posterior.
- **Alcance de la interfaz de usuario**: esta feature no entrega pantallas. Entrega el
  contenido, su estructura, su almacén de imágenes y la carga y validación de ambos. Las
  pantallas que lo consuman son features posteriores.
- **Variantes de tamaño de imagen**: se asumen dos usos por localización —miniatura e imagen
  en detalle— porque el diseño los necesita para el mapa y para la vista a pantalla completa,
  y porque la miniatura es lo único que puede verse sin compra. La generación automática de
  más resoluciones por dispositivo se aborda cuando exista origen remoto.
- **Textos de producto fuera del catálogo**: los textos de onboarding, del paywall, de la
  lista de ventajas y de los mensajes de bloqueo son copia de interfaz, no contenido de la
  guía, y quedan fuera de este catálogo. El precio lo dicta la tienda y no se almacena aquí.
- **Estado del usuario fuera del catálogo**: los guardados, los filtros elegidos, el idioma
  y el equipo del usuario son estado local de la persona, no contenido. El catálogo solo
  aporta los identificadores estables a los que ese estado apunta.
- **Escala prevista**: el diseño habla de 60 localizaciones, 5 de ellas gratuitas. Esta
  feature entrega las 5 gratuitas completas; el esquema debe sostener las 60 sin cambios.
- **Distancia y ubicación del usuario**: la distancia mostrada en el mapa y los filtros por
  distancia se calculan en la app, no se almacenan, y la app debe funcionar sin permiso de
  ubicación.
- **Decisiones cerradas (2026-09-18)**: el desenfoque de la miniatura bloqueada se aplica por
  código en el cliente, no con un recurso aparte; y el vocabulario de tipos de foto son
  etiquetas múltiples por localización, no una clasificación única.
- **Mapa**: se asume que la posición de cada localización se deriva de sus coordenadas. El
  prototipo usa posiciones relativas sobre un mapa esquemático; eso es una decisión de
  presentación, no un dato del catálogo.
- **Dependencia**: se apoya en el esqueleto de aplicación entregado en la feature 001.
- **Fuente de estos requisitos**: las pantallas del prototipo de diseño "Madrid Photo Guide"
  (onboarding, mapa en modo prueba, ficha de localización, contenido bloqueado, feed de tips,
  paywall y estado comprado).
