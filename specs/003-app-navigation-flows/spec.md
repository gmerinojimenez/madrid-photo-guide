# Feature Specification: Navegación y pantallas de la app

**Feature Branch**: `gmj/madrid-photo-guide-nav-de6360`

**Created**: 2026-09-19

**Status**: Draft

**Input**: User description: "Como usuario de la guía, quiero poder navegar por todas las pantallas de Madrid Photo Guide —onboarding, mapa, ficha de localización, tips, guardados, perfil y paywall— con la navegación real de la app, para poder recorrer el flujo completo (modo prueba → contenido bloqueado → paywall → comprado) tal como lo define el prototipo de diseño en `design/Guía de fotografía Madrid/MPG App.dc.html`, usando el catálogo de contenido ya implementado en la spec 002."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recorrer el mapa y abrir una localización accesible (Priority: P1)

Como persona que acaba de instalar la guía, quiero ver en un mapa dónde están las
localizaciones de Madrid y abrir la ficha completa de una de las gratuitas, para saber qué
foto se hace ahí, con qué parámetros y en qué punto exacto.

**Why this priority**: es el corazón del producto y la primera pantalla útil. Sin mapa y
sin ficha no hay guía, y todo lo demás (bloqueo, paywall, guardados, tips) cuelga de poder
abrir una localización.

**Independent Test**: se abre la app en el mapa, se comprueba que aparece un marcador por
cada localización del catálogo en su coordenada real, se toca una de las gratuitas y se
verifica que la ficha muestra su nombre, barrio, mejor momento, parámetros de captura,
descripción de la toma y coordenadas exactas. No depende de ninguna otra historia.

**Acceptance Scenarios**:

1. **Given** el catálogo cargado, **When** se muestra la pantalla de mapa, **Then** existe
   un marcador por cada localización del catálogo, situado en su ubicación declarada, y los
   marcadores de las localizaciones accesibles se distinguen visualmente de los bloqueados.
2. **Given** el mapa visible, **When** se toca el marcador de una localización gratuita,
   **Then** se abre su ficha con nombre, barrio, tipo de foto, mejor momento, parámetros de
   captura, descripción de la toma, descripción del barrio y coordenadas exactas.
3. **Given** una ficha abierta, **When** se usa el gesto o el control de retroceso,
   **Then** se vuelve a la pantalla desde la que se abrió, con su estado intacto (pestaña
   activa, texto buscado y filtros aplicados).
4. **Given** el mapa visible, **When** se escribe un texto en el buscador, **Then** solo
   quedan los marcadores de las localizaciones cuyo nombre, barrio o etiqueta coincide con
   ese texto, sin distinguir mayúsculas ni acentos.
5. **Given** el mapa visible, **When** se selecciona una etiqueta de tipo de foto,
   **Then** solo quedan los marcadores de las localizaciones que la llevan, y al
   deseleccionarla vuelven todas.
6. **Given** una ficha abierta, **When** se busca el dato de distancia hasta el punto,
   **Then** se indica que la distancia no está disponible, en lugar de mostrar un número.

---

### User Story 2 - Tropezar con contenido bloqueado y desbloquear la guía (Priority: P1)

Como persona en modo prueba, quiero entender qué me estoy perdiendo cuando toco una
localización de pago y poder desbloquear la guía completa desde ahí, para decidir si
compro sin tener que buscar dónde se paga.

**Why this priority**: es el flujo que sostiene el modelo de negocio. Además es el que
ejercita de verdad las reglas de acceso del catálogo, y la constitución exige que esas
reglas estén cubiertas extremo a extremo.

**Independent Test**: sin la compra, se toca una localización de pago, se comprueba que se
muestra el aviso de contenido bloqueado con el nombre y el barrio pero sin coordenadas, sin
parámetros de captura y sin descripción; se continúa al paywall, se confirma la compra y se
comprueba que esa misma localización abre ya su ficha completa.

**Acceptance Scenarios**:

1. **Given** una persona sin la compra, **When** toca una localización de pago, **Then**
   se muestra un aviso de contenido bloqueado con el nombre de la localización, su barrio y
   su zona aproximada, y no se muestran sus coordenadas exactas, ni sus parámetros de
   captura, ni la descripción de la toma.
2. **Given** el aviso de contenido bloqueado, **When** se elige seguir en modo prueba,
   **Then** el aviso se cierra y se vuelve a la pantalla anterior sin cambiar nada.
3. **Given** el aviso de contenido bloqueado, **When** se elige desbloquear, **Then** se
   abre el paywall con el precio único y el detalle de lo que incluye la guía completa.
4. **Given** el paywall abierto, **When** se confirma la compra, **Then** se vuelve al
   mapa, se muestra una confirmación de guía desbloqueada y la barra de modo prueba
   desaparece.
5. **Given** la compra hecha, **When** se toca la misma localización de pago, **Then** se
   abre directamente su ficha completa, con coordenadas exactas y parámetros de captura.
6. **Given** el paywall abierto, **When** se cierra sin comprar, **Then** se vuelve a la
   pantalla desde la que se abrió y el estado de acceso sigue siendo el de modo prueba.

---

### User Story 3 - Ver la app por primera vez y entender qué ofrece (Priority: P2)

Como persona que abre la app por primera vez, quiero una presentación breve de qué es la
guía, qué gana activando la ubicación y con cuánto contenido empiezo gratis, para saber
dónde estoy antes de llegar al mapa; y quiero no volver a verla nunca más.

**Why this priority**: da contexto y es la puerta natural al paywall, pero la app es
demostrable y usable entrando directamente al mapa. Puede entregarse después de las dos
historias anteriores sin bloquearlas.

**Independent Test**: en una instalación limpia se comprueba que la app arranca en el
primer paso de la presentación, se avanzan los tres pasos hasta el mapa, se cierra y se
vuelve a abrir la app, y se comprueba que arranca directamente en el mapa.

**Acceptance Scenarios**:

1. **Given** una instalación en la que nunca se ha completado la presentación, **When** se
   abre la app, **Then** se muestra el primer paso de la presentación y no las pestañas.
2. **Given** la presentación en el primer o el segundo paso, **When** se avanza, **Then**
   se muestra el paso siguiente y el indicador de progreso refleja el paso actual.
3. **Given** el segundo paso, que ofrece activar la ubicación, **When** se acepta o se
   pospone, **Then** en ambos casos se avanza al tercer paso y no se solicita ningún
   permiso del sistema.
4. **Given** el tercer y último paso, **When** se elige empezar gratis, **Then** se llega
   al mapa y la presentación queda marcada como vista.
5. **Given** el tercer y último paso, **When** se elige ver la guía completa, **Then** se
   llega al paywall, y la presentación queda igualmente marcada como vista.
6. **Given** una instalación en la que la presentación ya se completó, **When** se cierra y
   se vuelve a abrir la app, **Then** se arranca directamente en el mapa.

---

### User Story 4 - Consultar los consejos sobre Madrid (Priority: P2)

Como persona que visita Madrid, quiero leer los consejos generales sobre qué ver, dónde
comer, dónde dormir y cómo moverme, agrupados por tema y siempre disponibles, y poder
saltar desde un consejo a las localizaciones que menciona.

**Why this priority**: es contenido gratuito prometido en el producto y aporta valor desde
el primer minuto, pero no condiciona el flujo de compra ni el de mapa.

**Independent Test**: se abre la pestaña de consejos, se comprueba que aparecen agrupados
por categoría en el orden del catálogo, se filtra por una categoría, se abre un consejo y
se salta desde él a una localización relacionada.

**Acceptance Scenarios**:

1. **Given** el catálogo cargado, **When** se abre la pestaña de consejos, **Then** se
   listan todos los consejos con su categoría, su título y su contexto, en un orden estable.
2. **Given** la lista de consejos, **When** se selecciona una categoría, **Then** solo
   quedan los consejos de esa categoría, y al elegir "Todo" vuelven todos.
3. **Given** un consejo abierto, **When** se lee su detalle, **Then** se muestran su
   título, su categoría, su cuerpo completo y la lista de localizaciones relacionadas.
4. **Given** un consejo con localizaciones relacionadas, **When** se toca una de ellas,
   **Then** se abre su ficha si es accesible, o el aviso de contenido bloqueado si no lo es.
5. **Given** una persona sin la compra, **When** consulta cualquier consejo, **Then** lo
   ve completo: los consejos nunca se bloquean.

---

### User Story 5 - Guardar localizaciones para la próxima salida (Priority: P2)

Como persona que ya ha comprado la guía, quiero marcar localizaciones y encontrarlas
reunidas en una lista propia que sobreviva al cierre de la app, para preparar una ruta.

**Why this priority**: es una funcionalidad de la guía completa y refuerza el valor de la
compra, pero la app cumple su función sin ella.

**Independent Test**: con la compra activa se guardan dos localizaciones desde su ficha, se
comprueba que aparecen en la lista de guardados, se cierra y se reabre la app y se comprueba
que siguen ahí; se desmarca una y se comprueba que desaparece.

**Acceptance Scenarios**:

1. **Given** la compra hecha y una ficha abierta, **When** se marca la localización como
   guardada, **Then** el control refleja el estado guardado y la localización aparece en la
   lista de guardados.
2. **Given** una localización guardada, **When** se desmarca desde su ficha, **Then**
   desaparece de la lista de guardados.
3. **Given** localizaciones guardadas, **When** se cierra y se vuelve a abrir la app,
   **Then** la lista de guardados conserva exactamente las mismas localizaciones.
4. **Given** la compra hecha y ninguna localización guardada, **When** se abre la lista de
   guardados, **Then** se muestra un estado vacío que invita a guardar desde el mapa.
5. **Given** una persona sin la compra, **When** abre la lista de guardados, **Then** se
   muestra un estado vacío que explica que guardar forma parte de la guía completa y ofrece
   desbloquearla.
6. **Given** una persona sin la compra, **When** intenta guardar desde la ficha de una
   localización gratuita, **Then** no se guarda nada y se le ofrece desbloquear la guía.
7. **Given** el panel de filtros del mapa y la compra hecha, **When** se activa "solo
   guardados", **Then** el mapa deja únicamente los marcadores de las localizaciones
   guardadas.

---

### User Story 6 - Llegar hasta el punto de disparo (Priority: P3)

Como persona que ya está en Madrid con la cámara, quiero abrir el punto exacto de una
localización en la app de mapas de mi teléfono, o copiarme las coordenadas, para llegar
andando sin transcribir números a mano.

**Why this priority**: convierte la guía en algo utilizable en la calle, pero llega después
de que exista la ficha con sus coordenadas visibles.

**Independent Test**: se abre la ficha de una localización accesible, se pide navegar, se
comprueba que se ofrecen las dos aplicaciones de mapas y la opción de copiar, y que al
elegir una de ellas se entrega al sistema la ubicación correcta de esa localización.

**Acceptance Scenarios**:

1. **Given** una ficha accesible abierta, **When** se pide navegar hasta la foto, **Then**
   se ofrecen Google Maps, Apple Maps y copiar coordenadas, junto a las coordenadas del
   punto.
2. **Given** las opciones de navegación, **When** se elige una aplicación de mapas,
   **Then** el sistema la abre apuntando a las coordenadas exactas de esa localización.
3. **Given** las opciones de navegación, **When** se elige copiar coordenadas, **Then** las
   coordenadas quedan en el portapapeles y se confirma visualmente la copia.
4. **Given** una localización de pago y una persona sin la compra, **When** se intenta
   llegar a las opciones de navegación, **Then** no se alcanzan: la localización no llega a
   abrir ficha.

---

### User Story 7 - Consultar el estado de mi guía en el perfil (Priority: P3)

Como persona usuaria, quiero un sitio donde ver si tengo la guía completa o estoy en modo
prueba y qué ajustes tendrá la app, para orientarme.

**Why this priority**: cierra la cuarta pestaña y da entrada al paywall desde un segundo
sitio, pero sus opciones todavía no hacen nada en esta entrega.

**Independent Test**: se abre la pestaña de perfil en modo prueba y se comprueba que la
línea de plan indica modo prueba con el recuento real; se completa la compra y se comprueba
que la línea pasa a indicar guía completa.

**Acceptance Scenarios**:

1. **Given** una persona sin la compra, **When** abre el perfil, **Then** la línea de plan
   indica modo prueba con el número de localizaciones gratuitas sobre el total del catálogo,
   y se ofrece desbloquear la guía.
2. **Given** la compra hecha, **When** abre el perfil, **Then** la línea de plan indica
   guía completa con el total de localizaciones del catálogo, y no se ofrece desbloquear.
3. **Given** el perfil abierto, **When** se listan sus filas de ajustes, **Then** se
   muestran descarga sin conexión y restaurar compra, presentadas como informativas y sin
   acción asociada en esta entrega.

---

### Edge Cases

- ¿Qué ocurre si el catálogo no tiene ninguna localización de pago? La barra de modo prueba
  y el paywall siguen siendo coherentes porque los recuentos se derivan del catálogo; el
  recuento de gratuitas coincide con el total.
- ¿Qué ocurre si una búsqueda o un filtro no deja ninguna localización? El mapa queda sin
  marcadores y se informa de que no hay resultados, en lugar de mostrar una pantalla muda.
- ¿Qué ocurre si un consejo referencia una localización que no existe en el catálogo? Esa
  referencia se omite de la lista de localizaciones relacionadas y el consejo se muestra
  igual.
- ¿Qué ocurre si una localización guardada deja de existir en el catálogo? Se omite de la
  lista de guardados sin que la app falle.
- ¿Qué ocurre si el teléfono no tiene instalada la aplicación de mapas elegida? El sistema
  la resuelve como pueda (navegador, tienda); la app no promete que esté instalada y la
  opción de copiar coordenadas sigue disponible como alternativa.
- ¿Qué ocurre si se toca el control de guardar mientras el estado de la compra acaba de
  cambiar? Manda el estado vigente en el momento de la acción; nunca se guarda nada sin la
  compra.
- ¿Qué ocurre si el almacenamiento local no puede leerse al arrancar? Se trata como
  "presentación no vista" y "sin guardados", y la app arranca igualmente sin fallar.
- ¿Qué ocurre al volver atrás desde una ficha abierta desde un consejo? Se vuelve al detalle
  del consejo, no al mapa.

## Requirements *(mandatory)*

### Functional Requirements

#### Navegación y estructura

- **FR-001**: La app DEBE ofrecer cuatro secciones principales permanentes —mapa, consejos,
  guardados y perfil— conmutables entre sí y con su estado propio conservado al cambiar de
  una a otra.
- **FR-002**: La ficha de localización, el detalle de un consejo y el paywall DEBEN
  presentarse apiladas sobre la sección activa, no como secciones propias, y DEBEN poder
  cerrarse volviendo a la pantalla desde la que se abrieron.
- **FR-003**: El paywall DEBE presentarse de forma modal, cubriendo la pantalla, y DEBE
  poder cerrarse sin comprar.
- **FR-004**: Los avisos de contenido bloqueado, de navegación, de filtros y de compra
  completada DEBEN presentarse como paneles superpuestos sobre la pantalla activa, sin
  sustituirla ni alterar el historial de navegación.
- **FR-005**: La presentación inicial DEBE mostrarse cuando la app arranca sin haberse
  completado nunca, y DEBE dejar de mostrarse en todos los arranques posteriores.
- **FR-006**: La navegación DEBE resolverse con una única solución de rutas declarativas en
  todo el proyecto, sin mezclar enfoques por pantalla.

#### Contenido y acceso

- **FR-007**: Todas las pantallas DEBEN alimentarse del catálogo de contenido existente; no
  se admite contenido de guía escrito dentro de las pantallas.
- **FR-008**: El catálogo DEBE ampliarse con las nueve localizaciones de pago que nombra el
  prototipo —Cerro del Tío Pío, Círculo de Bellas Artes, Edificio Metrópolis, Matadero, Faro
  de Moncloa, Puente de Toledo, Palacio de Cristal, Casa de Campo y Calle de Lavapiés—,
  marcadas como de pago, con ficha completa y con el mismo carácter ficticio que las cinco
  existentes, y DEBE seguir superando la validación del catálogo.
- **FR-009**: La decisión de qué puede verse DEBE tomarse en el único módulo de acceso del
  núcleo; ninguna pantalla puede replicar esa regla por su cuenta.
- **FR-010**: Para una localización de pago sin la compra, la app NUNCA DEBE mostrar sus
  coordenadas exactas, sus parámetros de captura, la descripción de la toma ni la
  descripción del barrio: solo su nombre, su barrio, sus etiquetas y su zona aproximada.
- **FR-011**: Los consejos generales DEBEN estar siempre disponibles completos, con
  independencia del estado de la compra.
- **FR-012**: Todo recuento de localizaciones que se muestre al usuario —barra de modo
  prueba, línea de plan del perfil, textos del paywall y de la presentación inicial— DEBE
  derivarse del catálogo cargado en ese momento, y no de una cifra escrita en el texto.

#### Mapa

- **FR-013**: El mapa DEBE ser un mapa geográfico real, con las localizaciones situadas en
  sus coordenadas del catálogo: las accesibles en su punto exacto y las bloqueadas en su
  zona aproximada.
- **FR-014**: Los marcadores DEBEN distinguir visualmente las localizaciones accesibles de
  las bloqueadas.
- **FR-015**: El buscador de texto DEBE filtrar las localizaciones por nombre, barrio y
  etiqueta, ignorando mayúsculas y acentos, reutilizando la consulta del núcleo.
- **FR-016**: Las etiquetas de tipo de foto DEBEN filtrar el mapa, y DEBEN ofrecerse las
  etiquetas declaradas en el catálogo más una opción que no filtra nada.
- **FR-017**: La barra de modo prueba DEBE mostrarse solo mientras no se tenga la compra, e
  indicar cuántas localizaciones gratuitas hay sobre el total, con acceso directo al paywall.
- **FR-018**: El panel de filtros DEBE ofrecer las etiquetas de tipo de foto y el
  conmutador de "solo guardados" operativos, y la distancia visible pero inactiva y marcada
  como no disponible.
- **FR-019**: Los filtros y la búsqueda DEBEN componerse entre sí: el resultado es la
  intersección de todos los criterios activos.

#### Ficha de localización

- **FR-020**: La ficha DEBE mostrar el nombre, el barrio, el tipo de foto, el mejor momento,
  los parámetros de captura, la descripción de la toma, la descripción del barrio y las
  coordenadas exactas de la localización.
- **FR-021**: La ficha DEBE indicar que la distancia no está disponible en lugar de mostrar
  un valor de distancia.
- **FR-022**: La imagen de la ficha DEBE representarse con un marcador visual de
  sustitución, sin fotografía real.
- **FR-023**: La ficha DEBE ofrecer abrir el punto en Google Maps o en Apple Maps y copiar
  las coordenadas al portapapeles, y las tres acciones DEBEN funcionar de verdad contra el
  sistema.
- **FR-024**: La ficha DEBE ofrecer guardar y dejar de guardar la localización cuando se
  tiene la compra, reflejando el estado actual del marcado.

#### Guardados y persistencia

- **FR-025**: Las localizaciones guardadas DEBEN persistir en el dispositivo y sobrevivir al
  cierre de la app.
- **FR-026**: El hecho de haber completado la presentación inicial DEBE persistir en el
  dispositivo y sobrevivir al cierre de la app.
- **FR-027**: Guardar localizaciones DEBE estar reservado a quien tiene la compra; sin ella,
  la lista de guardados muestra un estado vacío con acceso al paywall.
- **FR-028**: Si el almacenamiento local no puede leerse, la app DEBE arrancar con valores
  por defecto seguros —presentación no vista, sin guardados— en lugar de fallar.

#### Compra (simulada en esta entrega)

- **FR-029**: La titularidad de compra DEBE consultarse a través de una única interfaz del
  núcleo, que en esta entrega responde con una implementación de sustitución en memoria que
  arranca en "sin la compra".
- **FR-030**: El botón de compra del paywall DEBE activar esa titularidad simulada, llevar
  al mapa y mostrar la confirmación de guía desbloqueada.
- **FR-031**: El cambio de titularidad DEBE reflejarse de inmediato en todas las pantallas
  afectadas: marcadores del mapa, barra de modo prueba, guardados, perfil y fichas.
- **FR-032**: El paywall DEBE mostrar el precio fijo de 9,99 € y el detalle de lo que
  incluye la guía completa, sin contactar con ninguna tienda.

#### Presentación

- **FR-033**: La app DEBE presentarse únicamente en su apariencia oscura, con la paleta del
  prototipo de diseño, sin seguir la preferencia de tema del sistema.
- **FR-034**: Todos los textos de interfaz DEBEN mostrarse en español, tomando de la
  localización del núcleo los que proceden del catálogo.

### Key Entities

- **Sección**: cada una de las cuatro áreas permanentes de la app (mapa, consejos,
  guardados, perfil), con su propio estado de navegación.
- **Estado de exploración del mapa**: el texto buscado, la etiqueta de tipo seleccionada y
  el conmutador de solo guardados que, combinados, determinan qué localizaciones se muestran.
- **Titularidad**: respuesta única a "¿esta persona tiene la guía completa?", consultada por
  todas las pantallas y simulada en esta entrega.
- **Marcado de guardado**: la relación entre una localización del catálogo y la lista
  personal de la persona usuaria, persistida en el dispositivo.
- **Presentación vista**: marca persistida de que la presentación inicial ya se completó.
- **Localización de pago**: pieza de contenido del catálogo, con ficha completa, marcada
  como de pago y por tanto proyectada como vista previa mientras no se tenga la compra.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desde el arranque en una instalación limpia, se puede recorrer el flujo
  completo —presentación, mapa, contenido bloqueado, paywall, compra, ficha completa— sin
  salir de la app y sin encontrar una pantalla sin salida.
- **SC-002**: El 100 % de las localizaciones del catálogo aparece en el mapa, y el 100 % de
  las accesibles abre una ficha con sus datos reales del catálogo.
- **SC-003**: Ningún dato reservado (coordenadas exactas, parámetros de captura, descripción
  de la toma o del barrio) de una localización de pago es alcanzable sin la compra, por
  ninguna ruta de la app, incluidos mapa, búsqueda, consejos relacionados y guardados.
- **SC-004**: Los recuentos mostrados al usuario coinciden exactamente con el contenido del
  catálogo: al añadir o retirar una localización editando solo datos, los textos se
  actualizan sin tocar código.
- **SC-005**: Tras cerrar y reabrir la app, la presentación inicial no vuelve a aparecer y
  la lista de guardados conserva exactamente los mismos elementos.
- **SC-006**: Desde la ficha de cualquier localización accesible se llega en dos toques a
  tener el punto abierto en una app de mapas o sus coordenadas en el portapapeles.
- **SC-007**: Cada una de las siete historias de usuario queda cubierta por tests de
  aceptación que ejercitan la pantalla o el flujo como lo haría la persona usuaria, y las
  reglas de acceso quedan cubiertas además por tests unitarios del núcleo.
- **SC-008**: El comportamiento observable es idéntico en Android y en iOS; la única
  divergencia admitida es la aplicación de mapas ofrecida por el sistema.

## Assumptions

- **Compra simulada**: en esta entrega no hay integración con ninguna tienda ni validación
  de recibo. La titularidad vive en memoria, arranca en "sin la compra" y se activa desde el
  botón del paywall; no persiste entre arranques. La integración real de pagos es una spec
  posterior.
- **Sin geolocalización**: no se solicitan permisos de ubicación ni se calcula distancia
  alguna. El paso de la presentación que ofrece activar la ubicación avanza sin efecto real,
  la distancia en la ficha se declara no disponible y el filtro de distancia se muestra
  inactivo. La geolocalización real es una spec posterior.
- **Sin fotografías**: las imágenes se representan con bloques de color, igual que en el
  prototipo. La integración con el almacén de imágenes de la spec 002 es una spec posterior.
- **Persistencia local**: el marcado de guardados y la marca de presentación vista se
  guardan en la base de datos local del dispositivo. La titularidad, en cambio, no se
  persiste en esta entrega.
- **Tema único**: la app se entrega solo en oscuro, con la paleta del prototipo, y se
  retira del esqueleto actual cualquier bifurcación por preferencia de tema del sistema.
- **Recuentos derivados**: el prototipo escribe "60 localizaciones" como cifra fija; aquí
  esa cifra se sustituye por el total real del catálogo, que tras la ampliación de FR-008
  será de catorce localizaciones, cinco de ellas gratuitas. El copy se redacta de modo que
  siga siendo correcto al crecer el catálogo.
- **Contenido ficticio**: las nueve localizaciones de pago añadidas al catálogo mantienen el
  carácter de maqueta de las cinco existentes: coordenadas reales de Madrid, pero fichas,
  parámetros de captura y descripciones inventadas.
- **Idioma único**: toda la interfaz está en español. La internacionalización a otros
  idiomas queda fuera de alcance, aunque el catálogo ya admita varios.
- **Perfil informativo**: las filas de descarga sin conexión y restaurar compra se muestran
  sin acción asociada, porque sus funcionalidades de respaldo (almacenamiento offline
  gestionado, pagos) están fuera de alcance. Aplicación de navegación, equipo fotográfico e
  idioma no forman parte de la pantalla en esta entrega: no aportan orientación sin una
  funcionalidad de respaldo detrás, a diferencia de las dos filas que sí quedan.
- **Dependencia de la spec 002**: esta feature consume el catálogo, la consulta de
  localizaciones, la agrupación de consejos y la proyección de acceso ya implementados, sin
  reimplementar ninguna de esas reglas.

## Out of Scope

- Integración real de pagos con la tienda y validación de recibo.
- Geolocalización real, permisos de ubicación y cálculo u ordenación por distancia.
- Fotografías reales y su descarga o resolución desde el almacén de imágenes.
- Descarga offline gestionada del contenido.
- Datos de equipo fotográfico de la persona usuaria.
- Internacionalización a idiomas distintos del español.
