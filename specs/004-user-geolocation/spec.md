# Feature Specification: Geolocalización de la persona usuaria

**Feature Branch**: `claude/location-permission-spec-prompt-xfnrut`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Geolocalización real: permiso de ubicación, distancia, punto azul, filtro y orden por cercanía. La spec 003 dejó fuera la geolocalización: el paso 2 de la presentación («Activar ubicación») avanza sin pedir nada, la ficha y el panel de bloqueado dicen «Distancia no disponible» y el filtro de distancia está inactivo. Esta feature lo hace real sin romper nada de lo que ya funciona sin ubicación. Permiso solo en primer plano, aproximada admitida, pedido en la presentación y de forma contextual, degradación con enlace a Ajustes, fila en Perfil; distancia en línea recta en vivo, aviso lejos de Madrid, distancia redondeada para contenido bloqueado, última posición conocida cacheada en el dispositivo, solo el estado del permiso como evento anónimo."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a qué distancia está cada localización (Priority: P1)

Como persona que pasea por Madrid con la guía, quiero conceder mi ubicación y ver en la ficha
de cada localización a qué distancia estoy de ella, para decidir si me acerco ahora o la
dejo para otro momento.

**Why this priority**: es el primer valor tangible de conceder la ubicación y el que ya
promete la presentación. Contiene el flujo completo de pedir el permiso, obtener la posición
y mostrar una distancia, del que cuelgan todas las demás historias.

**Independent Test**: en una instalación limpia se completa la presentación pulsando
«Activar ubicación», se concede el permiso en el diálogo del sistema, se abre una
localización gratuita y se comprueba que la ficha muestra una distancia real en el formato
acordado en lugar de «Distancia no disponible».

**Acceptance Scenarios**:

1. **Given** el paso 2 de la presentación, **When** se pulsa «Activar ubicación», **Then**
   el sistema muestra su diálogo de permiso de ubicación y, sea cual sea la respuesta, la
   presentación avanza al paso 3.
2. **Given** el paso 2 de la presentación, **When** se pulsa «Ahora no», **Then** avanza al
   paso 3 sin que el sistema muestre ningún diálogo de permiso.
3. **Given** el permiso concedido con ubicación precisa, **When** se abre la ficha de una
   localización accesible, **Then** se muestra la distancia en línea recta desde la
   posición actual, en metros por debajo de 1 km («450 m») y en kilómetros con una decimal
   y coma decimal a partir de 1 km («1,2 km»).
4. **Given** el permiso concedido solo con ubicación aproximada, **When** se abre una
   ficha, **Then** se muestra la distancia acompañada de una indicación visible de que es
   aproximada.
5. **Given** una ficha abierta con el permiso concedido, **When** la persona se desplaza
   más de 25 m, **Then** la distancia mostrada se actualiza sin que tenga que salir y
   volver a entrar.
6. **Given** el permiso nunca pedido o pospuesto, **When** se toca la distancia en una
   ficha, **Then** se pide el permiso en ese momento y, si se concede, la distancia pasa a
   mostrarse.

---

### User Story 2 - Usar la app sin dar la ubicación (Priority: P1)

Como persona que prefiere no compartir su ubicación, o que la ha denegado sin querer, quiero
que la guía siga funcionando entera, que me explique qué me estoy perdiendo sin
perseguirme, y que me diga cómo activarla si cambio de opinión.

**Why this priority**: es la garantía de no regresión. Todo lo que hoy funciona sin
ubicación debe seguir funcionando, y una denegación —sobre todo una permanente— no puede
dejar a la persona sin salida.

**Independent Test**: con el permiso denegado se recorre la app (mapa, búsqueda, ficha,
guardados, tips, perfil) y se comprueba que todo funciona, que las distancias dicen «no
disponible», que ningún diálogo de permiso aparece sin que la persona lo pida y que, con
la denegación permanente, tocar una función de ubicación ofrece abrir los Ajustes del
sistema.

**Acceptance Scenarios**:

1. **Given** el permiso denegado, **When** se usa cualquier pantalla de la app, **Then**
   todo funciona como en la entrega anterior y donde iría una distancia se indica que no
   está disponible.
2. **Given** el permiso denegado pero el sistema todavía permite volver a preguntar,
   **When** se toca una función que necesita la ubicación, **Then** se explica para qué se
   usa y se vuelve a lanzar el diálogo del sistema solo si la persona lo confirma.
3. **Given** el permiso denegado de forma permanente, **When** se toca una función que
   necesita la ubicación, **Then** se explica para qué se usa y se ofrece abrir los Ajustes
   del sistema, sin lanzar ningún diálogo de permiso.
4. **Given** el permiso denegado, **When** se abre la app, se cambia de pantalla o se
   vuelve a abrir tras cerrarla, **Then** la app no muestra por iniciativa propia ningún
   aviso ni diálogo que pida la ubicación.
5. **Given** la app en segundo plano, **When** la persona concede o revoca el permiso en
   los Ajustes del sistema y vuelve a la app, **Then** la app refleja el nuevo estado sin
   reiniciarse: aparecen o desaparecen las distancias, el punto de posición y los criterios
   por cercanía.

---

### User Story 3 - Verme en el mapa y filtrar por lo que tengo cerca (Priority: P2)

Como persona que explora el mapa, quiero ver dónde estoy entre los marcadores, poder
centrar el mapa en mí y quedarme solo con las localizaciones a menos de 1 km o de 3 km,
para elegir la próxima foto sin salir de la zona en la que estoy.

**Why this priority**: es la función que el prototipo promete («verás primero lo que
tienes cerca»), pero depende de la historia 1 para existir y la app sigue siendo útil sin
ella.

**Independent Test**: con el permiso concedido y una posición simulada dentro de Madrid se
comprueba que el mapa muestra el punto de posición, que el botón de centrar lleva la vista
a él y que, al elegir «< 1 km» en el panel de filtros, solo quedan en el mapa las
localizaciones a menos de 1 km de esa posición.

**Acceptance Scenarios**:

1. **Given** el permiso concedido, **When** se muestra el mapa, **Then** aparece un
   indicador de la posición actual que se mueve con la persona.
2. **Given** el permiso concedido y el mapa desplazado a otra zona, **When** se pulsa
   «centrar en mí», **Then** el mapa se centra en la posición actual.
3. **Given** el permiso concedido y una posición dentro de Madrid, **When** se elige
   «< 1 km» o «< 3 km» en el panel de filtros, **Then** el mapa muestra solo las
   localizaciones cuya distancia es menor que ese radio, compuesto con la búsqueda, la
   etiqueta y «solo guardados».
4. **Given** el panel de filtros, **When** se elige «Todo Madrid», **Then** el criterio de
   distancia deja de filtrar.
5. **Given** el permiso nunca pedido o pospuesto, **When** se toca el filtro de distancia o
   «centrar en mí», **Then** se pide el permiso en ese momento.
6. **Given** el permiso no concedido, **When** se abre el panel de filtros, **Then** el
   filtro de distancia aparece inactivo con su motivo, como en la entrega anterior.

---

### User Story 4 - Ordenar por cercanía (Priority: P2)

Como persona con una lista de sitios guardados o una búsqueda hecha, quiero ordenarlos del
más cercano al más lejano, para planificar el recorrido empezando por lo que tengo al lado.

**Why this priority**: amplía el valor del filtro de distancia a las listas, pero es un
refinamiento sobre las historias 1 y 3.

**Independent Test**: con el permiso concedido, la compra hecha, varias localizaciones
guardadas y una posición simulada, se elige el orden por cercanía en el panel de filtros y
se comprueba que la lista de guardados aparece ordenada de menor a mayor distancia.

**Acceptance Scenarios**:

1. **Given** el permiso concedido, **When** se abre el panel de filtros, **Then** se ofrece
   un criterio de orden con al menos el orden por defecto actual y «por cercanía».
2. **Given** el orden por cercanía elegido, **When** se muestra la pestaña de Guardados,
   **Then** las localizaciones aparecen de la más cercana a la más lejana y el orden se
   recalcula cuando la persona se desplaza.
3. **Given** el orden por cercanía elegido y una búsqueda activa en el mapa, **When** se
   muestran sus resultados, **Then** aparecen de la más cercana a la más lejana.
   [NEEDS CLARIFICATION: el mapa hoy no tiene una lista de resultados, solo filtra
   marcadores. ¿Esta feature añade una lista de resultados ordenable sobre el mapa, o el
   orden por cercanía se limita a Guardados?]
4. **Given** el orden por cercanía elegido, **When** el permiso deja de estar concedido,
   **Then** el orden vuelve al de por defecto y el criterio aparece inactivo.

---

### User Story 5 - Distancia de lo que aún no he desbloqueado (Priority: P2)

Como persona en modo prueba, quiero saber más o menos a qué distancia están las
localizaciones de pago y que entren en el filtro y en el orden por cercanía, para valorar
si la guía completa me compensa en la zona en la que estoy, sin que eso me revele dónde
está exactamente el punto.

**Why this priority**: refuerza el paso a la compra con información útil, pero introduce
una regla de acceso nueva que debe cumplirse sin excepciones, así que se aísla en su propia
historia.

**Independent Test**: sin la compra, con el permiso concedido y una posición simulada, se
abre el panel de una localización bloqueada y se comprueba que la distancia aparece como
valor redondeado según la regla, y que desplazando la posición simulada unos metros el
valor mostrado no cambia salvo al cruzar un escalón.

**Acceptance Scenarios**:

1. **Given** una localización de pago sin la compra y el permiso concedido, **When** se
   abre su panel de contenido bloqueado, **Then** la distancia se muestra redondeada: «< 1
   km» por debajo de 1 km y, a partir de ahí, en múltiplos de 0,5 km («~2,5 km»).
2. **Given** una localización de pago sin la compra, **When** se aplica el filtro de
   distancia o el orden por cercanía, **Then** esa localización participa usando su
   distancia redondeada, no la exacta.
3. **Given** una localización de pago sin la compra, **When** se inspecciona cualquier
   pantalla o dato que la app entrega a la interfaz, **Then** en ningún momento aparece su
   distancia exacta ni sus coordenadas exactas.
4. **Given** la compra hecha, **When** se abre esa misma localización, **Then** la ficha
   muestra su distancia exacta como cualquier otra accesible.

---

### User Story 6 - Consultar y cambiar el estado de la ubicación desde el perfil (Priority: P3)

Como persona que quiere saber si la guía está usando su ubicación, quiero ver en el perfil
el estado actual y tener a mano la acción para activarla, para no tener que buscar en los
ajustes del teléfono.

**Why this priority**: es un punto de control y de recuperación, útil pero no necesario
para el valor principal.

**Independent Test**: se recorren los cuatro estados del permiso con el doble de pruebas y
se comprueba que la fila «Ubicación» del perfil muestra el estado correcto y la acción que
corresponde a cada uno.

**Acceptance Scenarios**:

1. **Given** cada uno de los estados «sin pedir», «concedida», «aproximada» y «denegada»,
   **When** se abre el perfil, **Then** la fila «Ubicación» muestra ese estado.
2. **Given** el estado «sin pedir» o denegado con posibilidad de volver a preguntar,
   **When** se toca la fila, **Then** se lanza el diálogo de permiso del sistema.
3. **Given** el estado «aproximada» o denegado de forma permanente, **When** se toca la
   fila, **Then** se abren los Ajustes del sistema para la app.
4. **Given** el estado «concedida», **When** se toca la fila, **Then** se abren los Ajustes
   del sistema, donde la persona puede retirarla.

---

### Edge Cases

- **Lejos de Madrid**: con la posición a más de 50 km de la Puerta del Sol, las distancias
  se muestran igualmente, pero el filtro de distancia y el orden por cercanía quedan
  inactivos con el aviso «Estás lejos de Madrid». Si la persona vuelve dentro del umbral,
  se reactivan sin intervención.
- **Criterio activo al salir del umbral**: si «< 1 km» o el orden por cercanía estaban
  elegidos y la persona pasa a estar lejos de Madrid, el criterio deja de aplicarse y el
  panel explica por qué, en lugar de mostrar un mapa vacío.
- **Sin señal**: con el permiso concedido pero sin poder obtener una posición (interior,
  GPS desactivado en el sistema, tiempo agotado), se usa la última posición conocida si
  existe; si no, las distancias se muestran como no disponibles con el motivo, sin
  bloquear la pantalla.
- **Servicios de ubicación del sistema apagados**: se trata como «sin señal» y, donde se
  necesite la ubicación, se explica que están apagados en el sistema.
- **Última posición antigua**: al arrancar se usa la última posición guardada; si tiene más
  de 10 minutos, las distancias se marcan como antiguas hasta que llegue una lectura
  fresca, y la marca desaparece en cuanto llega.
- **Revocación**: si el permiso se revoca o se deniega, la última posición guardada se
  borra, desaparecen distancias, punto de posición y criterios por cercanía, y los
  criterios activos vuelven a sus valores por defecto.
- **Paso de aproximada a precisa** (o al revés) en Ajustes: al volver a la app cambia la
  indicación de aproximada y el perfil refleja el nuevo estado.
- **Diálogo contextual y permiso concedido a la vez**: si la persona concede el permiso
  desde un punto contextual, la acción que lo desencadenó se completa (se aplica el filtro,
  se centra el mapa, se muestra la distancia) sin tener que repetirla.
- **Onboarding ya visto en una instalación que viene de la entrega anterior**: el permiso
  arranca como «sin pedir» y solo se pide desde los puntos contextuales o el perfil.
- **Almacenamiento local ilegible**: si la última posición no puede leerse o escribirse, la
  app sigue funcionando sin ella, esperando a una lectura fresca.
- **Localización bloqueada muy cerca**: una localización de pago a pocos metros se sigue
  mostrando como «< 1 km», nunca con un valor más fino.

## Requirements *(mandatory)*

### Functional Requirements

#### Permiso

- **FR-001**: La app DEBE pedir únicamente el permiso de ubicación mientras se usa la app.
  NUNCA DEBE pedir ni declarar acceso a la ubicación en segundo plano.
- **FR-002**: La app DEBE funcionar con la ubicación aproximada que ofrece el sistema,
  indicando de forma visible junto a cada distancia que es aproximada.
- **FR-003**: El diálogo de permiso del sistema DEBE lanzarse solo como respuesta a una
  acción explícita de la persona: «Activar ubicación» en el paso 2 de la presentación, un
  punto contextual (filtro de distancia, orden por cercanía, «centrar en mí», distancia de
  la ficha) o la fila «Ubicación» del perfil.
- **FR-004**: «Ahora no» en el paso 2 de la presentación DEBE avanzar sin lanzar ningún
  diálogo, y la presentación DEBE avanzar al paso 3 tras «Activar ubicación» sea cual sea
  la respuesta al diálogo.
- **FR-005**: Con el permiso denegado, la app NO DEBE mostrar por iniciativa propia avisos
  ni diálogos que pidan la ubicación.
- **FR-006**: En un punto contextual con el permiso denegado, la app DEBE explicar para qué
  se usa la ubicación y ofrecer: volver a preguntar, si el sistema aún lo permite, o abrir
  los Ajustes del sistema, si la denegación es permanente.
- **FR-007**: Al volver del segundo plano, la app DEBE releer el estado del permiso y
  aplicar cualquier cambio hecho en los Ajustes sin necesidad de reiniciarse.
- **FR-008**: Si el permiso se concede desde un punto contextual, la acción que lo
  desencadenó DEBE completarse sin que la persona tenga que repetirla.
- **FR-009**: El perfil DEBE mostrar una fila «Ubicación» con el estado actual (sin pedir,
  concedida, aproximada o denegada) y la acción que le corresponde según las historias.
- **FR-010**: Los textos que el sistema muestra al pedir el permiso DEBEN estar en español,
  explicar el uso real (distancias y ubicación en el mapa) y ser coherentes con el paso 2
  de la presentación.

#### Distancia

- **FR-011**: La distancia DEBE calcularse en línea recta sobre la superficie terrestre
  entre la posición de la persona y las coordenadas de la localización.
- **FR-012**: La distancia DEBE mostrarse en metros enteros por debajo de 1 km y en
  kilómetros con una decimal y coma decimal a partir de 1 km.
- **FR-013**: Mientras la app está en primer plano y con el permiso concedido, las
  distancias, el punto de posición, el filtro y el orden DEBEN actualizarse cuando la
  persona se desplaza más de 25 m desde la última posición usada. La app NO DEBE seguir la
  posición en segundo plano.
- **FR-014**: Sin permiso, sin posición disponible o con posición y permiso pero sin
  lectura válida, la distancia DEBE mostrarse como no disponible, con el motivo cuando se
  conozca.
- **FR-015**: Con la posición a más de 50 km de la Puerta del Sol, las distancias DEBEN
  seguir mostrándose, y el filtro de distancia y el orden por cercanía DEBEN quedar
  inactivos con el aviso «Estás lejos de Madrid».

#### Mapa, filtro y orden

- **FR-016**: Con el permiso concedido, el mapa DEBE mostrar la posición actual de la
  persona y ofrecer una acción para centrar la vista en ella.
- **FR-017**: El panel de filtros DEBE ofrecer el filtro de distancia operativo con las
  opciones «< 1 km», «< 3 km» y «Todo Madrid», siendo «Todo Madrid» la opción por defecto.
- **FR-018**: El filtro de distancia DEBE componerse con la búsqueda, la etiqueta y «solo
  guardados»: el resultado es la intersección de todos los criterios activos.
- **FR-019**: El panel de filtros DEBE ofrecer un criterio de orden con el orden actual por
  defecto y «por cercanía», que se aplica a la pestaña de Guardados y a los resultados de
  búsqueda del mapa (ver clarificación en la historia 4).
- **FR-020**: Sin permiso, con la ubicación no disponible o lejos de Madrid, el filtro de
  distancia y el orden por cercanía DEBEN mostrarse inactivos con su motivo, y los criterios
  que estuvieran activos DEBEN dejar de aplicarse.

#### Contenido bloqueado

- **FR-021**: Para una localización de pago sin la compra, la app NUNCA DEBE mostrar ni
  entregar a la interfaz su distancia exacta ni sus coordenadas exactas. Solo un valor
  redondeado: «< 1 km» por debajo de 1 km y, desde ahí, el múltiplo de 0,5 km más cercano.
- **FR-022**: Las localizaciones de pago sin la compra DEBEN participar en el filtro de
  distancia y en el orden por cercanía usando su distancia redondeada.
- **FR-023**: La decisión de qué distancia puede verse para cada localización DEBE tomarse
  en el único módulo de acceso del núcleo, junto a la proyección de acceso existente;
  ninguna pantalla puede calcular distancias ni replicar esa regla por su cuenta.

#### Última posición conocida

- **FR-024**: La app DEBE guardar en el dispositivo la última posición conocida y el
  momento en que se obtuvo, y usarla al arrancar mientras llega una lectura nueva.
- **FR-025**: Una posición con más de 10 minutos de antigüedad DEBE marcarse como antigua
  en todo lugar donde se muestre una distancia derivada de ella, hasta que llegue una
  lectura nueva.
- **FR-026**: La última posición guardada DEBE borrarse cuando el permiso se revoca o se
  deniega.
- **FR-027**: Si el almacenamiento local de la última posición falla, la app DEBE seguir
  funcionando sin ella en lugar de fallar.

#### Privacidad y observabilidad

- **FR-028**: Las coordenadas y distancias de la persona NUNCA DEBEN salir del dispositivo.
- **FR-029**: La app DEBE registrar como evento anónimo cada resultado de una petición de
  permiso: el estado resultante (concedida, aproximada, denegada) y el origen
  (presentación, contextual, perfil), sin coordenadas, distancias ni identificadores de
  localización.

#### Paridad y calidad

- **FR-030**: El comportamiento observable DEBE ser el mismo en Android y en iOS. Las únicas
  diferencias admitidas son el aspecto del diálogo de permiso del sistema y de la pantalla
  de Ajustes.
- **FR-031**: El acceso a la ubicación del dispositivo DEBE poder sustituirse en los tests
  por un doble que reproduzca los estados concedida, aproximada, denegada, denegada de
  forma permanente y sin señal, y una posición simulada.

### Key Entities

- **Estado del permiso**: situación actual del acceso a la ubicación: sin pedir, concedida
  (precisa), aproximada, denegada (con posibilidad de volver a preguntar) o denegada de
  forma permanente. Se relee al volver del segundo plano.
- **Posición de la persona**: latitud, longitud, precisión (precisa o aproximada) y momento
  de obtención. Vive en memoria; la última conocida se persiste en el dispositivo y se
  considera antigua pasados 10 minutos.
- **Distancia visible**: la distancia que la interfaz puede mostrar de una localización:
  exacta para las accesibles, redondeada para las bloqueadas, o no disponible con su
  motivo (sin permiso, sin posición). Puede llevar las marcas de aproximada y de antigua.
- **Criterios de exploración**: los que ya existían (texto, etiqueta, solo guardados) más
  el radio de distancia (< 1 km, < 3 km, Todo Madrid) y el criterio de orden (por defecto,
  por cercanía).
- **Evento de permiso**: registro anónimo de un resultado de petición de permiso: estado
  resultante y origen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con el permiso concedido y buena señal, la distancia aparece en una ficha
  recién abierta en menos de 2 segundos, o de forma inmediata si hay una última posición
  guardada.
- **SC-002**: La distancia mostrada para una localización accesible difiere menos de un 1 %
  de la distancia en línea recta de referencia entre las mismas dos coordenadas.
- **SC-003**: Con el permiso denegado, el 100 % de los escenarios de aceptación de la
  entrega anterior siguen pasando sin cambios en su resultado.
- **SC-004**: En ningún flujo de la app aparece un diálogo de permiso de ubicación que no
  haya sido provocado por una acción explícita de la persona en ese momento.
- **SC-005**: Para ninguna localización de pago sin la compra existe una pantalla, estado o
  dato entregado a la interfaz que contenga su distancia exacta o sus coordenadas exactas.
- **SC-006**: Ninguna coordenada ni distancia de la persona aparece en ningún dato que la
  app envíe fuera del dispositivo.
- **SC-007**: Tras cambiar el permiso en los Ajustes del sistema, la app refleja el nuevo
  estado en menos de 1 segundo al volver a primer plano.
- **SC-008**: Cada flujo de permiso (conceder, conceder aproximada, denegar, denegar de
  forma permanente, revocar en Ajustes, sin señal) tiene al menos un test de aceptación, y
  las reglas de cálculo, redondeo, filtro, orden, umbral de lejanía y antigüedad tienen
  tests unitarios del núcleo.
- **SC-009**: El comportamiento observable es idéntico en Android y en iOS salvo en el
  aspecto del diálogo de permiso y de la pantalla de Ajustes.

## Assumptions

- **Dependencia de la spec 003**: se reutilizan la presentación, el panel de filtros, la
  ficha, el panel de bloqueado, Guardados, el perfil y la base de datos local de
  preferencias, sustituyendo los marcadores de «no disponible» que dejó esa entrega.
- **Umbrales fijos**: 25 m de desplazamiento para recalcular, 50 km desde la Puerta del Sol
  como frontera de «lejos de Madrid», escalones de 0,5 km para las bloqueadas y 10 minutos
  de antigüedad. Son constantes del producto, no configurables por la persona usuaria.
- **Radios del filtro**: se toman del prototipo («< 1 km», «< 3 km», «Todo Madrid»), con
  límite estricto (una localización a exactamente 1 km no entra en «< 1 km»).
- **Orden por defecto**: el orden actual de cada lista se mantiene como «por defecto»; «por
  cercanía» ordena de menor a mayor distancia y deshace empates por ese orden por defecto.
- **Criterios no persistidos**: el radio y el orden elegidos viven durante la sesión, como
  el resto de filtros actuales, y no sobreviven al cierre de la app.
- **Evento de permiso**: se registra a través del punto de observabilidad del núcleo.
  Mientras Firebase no esté integrado, el evento queda definido y registrado por ese punto
  sin salir del dispositivo; la integración con Firebase es de otra spec.
- **Copy del paso 2**: se mantiene el texto actual de la presentación, que ya explica el uso
  de la ubicación; se revisa solo si no casa con los textos del diálogo del sistema.
- **Sin nuevos servicios**: la distancia se calcula en el dispositivo; no se usa ningún
  servicio externo de rutas ni de geocodificación.
- **Precisión de la zona aproximada**: la posición de los marcadores bloqueados en el mapa
  sigue siendo su zona aproximada, como en la spec 003; esta feature no la cambia.

## Out of Scope

- Ubicación en segundo plano, geofencing y avisos de proximidad.
- Rutas, distancia a pie o tiempo de llegada.
- Compartir la ubicación de la persona con terceros o con otras personas.
- Persistencia del radio y del orden elegidos entre sesiones.
- Integración real con Firebase como destino de los eventos.
- Cambios en la navegación hasta el punto de disparo (sigue delegada en la app de mapas).
