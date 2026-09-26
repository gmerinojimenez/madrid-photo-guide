# Feature Specification: Visualización completa de fotos (sin recorte)

**Feature Branch**: `005-uncropped-photo-display`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "un bug que he encontrado, las fotos salen recortadas, sin embargo, al ser una app de fotografía esto es crítico, ya que todas las fotos deberían mostrarse completamente. Para solucionarlo quiero hacer 2 cosas: la primera es que si se tapea en una foto se vea la foto a pantalla completa; la segunda: quiero explorar opciones de diseño para que la foto se muestre entera dentro del diseño de la pantalla. La mayoría de fotos son horizontales y tienen la misma proporción, pero tal vez en el futuro haya verticales. Explora soluciones"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la foto completa a pantalla completa al tocarla (Priority: P1)

Una persona está viendo la ficha de un lugar (o una tarjeta en el listado) y quiere apreciar la fotografía sin que ninguna parte esté recortada. Toca la foto y esta se abre en una vista a pantalla completa que muestra la imagen entera, sin recortar ningún borde.

**Why this priority**: Es la solución más directa y de mayor impacto al problema reportado: garantiza que, en cualquier punto de la app, el usuario siempre tiene una forma de ver la foto completa tal y como fue tomada. Es la app un producto centrado en fotografía, mostrar la foto recortada mina la confianza en el catálogo.

**Independent Test**: Puede probarse tocando cualquier foto visible en la app (tarjeta de listado, cabecera de ficha) y comprobando que se abre una vista que muestra el 100% del contenido de la imagen, sin recortes, y que puede cerrarse para volver a la pantalla anterior.

**Acceptance Scenarios**:

1. **Given** el usuario está en la ficha de un lugar con una foto horizontal, **When** toca la foto, **Then** se abre una vista a pantalla completa donde se ve la imagen entera (los cuatro bordes originales), sin ninguna parte recortada.
2. **Given** el usuario está viendo la vista a pantalla completa de una foto, **When** realiza el gesto/acción de cierre (p. ej. tocar de nuevo o un botón de cerrar), **Then** vuelve a la pantalla desde la que abrió la foto, en el mismo estado en que la dejó.
3. **Given** una foto es vertical en lugar de horizontal, **When** el usuario la abre a pantalla completa, **Then** se muestra igualmente entera y sin recortar, adaptando el espacio sobrante en lugar de cortar la imagen.

---

### User Story 2 - Las fotos se muestran enteras en su contexto habitual (tarjetas, ficha) (Priority: P2)

Una persona navega el listado de lugares y la ficha de detalle. Actualmente los contenedores de foto recortan la imagen para rellenar un hueco de tamaño fijo. Se quiere rediseñar cómo se encajan las fotos en tarjetas y cabeceras para que, sin necesidad de tocarlas, se vea el encuadre completo de cada fotografía, contemplando que la mayoría son horizontales con la misma proporción pero que en el futuro podría haber también verticales.

**Why this priority**: Complementa la Historia 1: reduce la necesidad de tocar cada foto para verla bien, y corrige el problema también en la experiencia de navegación normal (listado y ficha), no solo en la vista ampliada.

**Independent Test**: Puede probarse revisando el listado de lugares y varias fichas de detalle con el catálogo de fotos actual y comprobando visualmente que ninguna foto pierde contenido por recorte, y que una foto vertical de prueba también se muestra completa sin deformarse.

**Acceptance Scenarios**:

1. **Given** el listado de lugares con tarjetas que incluyen una foto horizontal, **When** se renderiza la tarjeta, **Then** la foto se ve completa dentro de la tarjeta (sin recortar ninguno de sus bordes), aunque eso implique dejar espacio libre alrededor de la imagen.
2. **Given** la ficha de detalle de un lugar con su foto principal, **When** se renderiza la cabecera, **Then** la foto se ve completa, sin recortes, y sin estirarse ni deformarse para rellenar el hueco.
3. **Given** una foto de prueba con orientación vertical, **When** se muestra en una tarjeta o cabecera pensada originalmente para fotos horizontales, **Then** se sigue viendo completa y sin deformar, sin romper el diseño general de la pantalla (p. ej. sin desbordar ni descuadrar elementos vecinos).

---

### Edge Cases

- ¿Qué ocurre cuando el lugar no tiene todavía una foto real disponible y se muestra el marcador/placeholder actual? El placeholder no debe convertirse en un punto de entrada a una vista a pantalla completa vacía o rota.
- ¿Qué ocurre si la foto tiene una proporción muy distinta a la habitual (muy panorámica o casi cuadrada)? Debe seguir mostrándose completa, sin recorte, dejando el espacio sobrante en blanco/neutro en vez de recortar o deformar.
- ¿Qué ocurre si el usuario gira el dispositivo mientras está en la vista a pantalla completa? La foto debe seguir mostrándose completa y correctamente encajada en la nueva orientación.
- ¿Qué ocurre si la imagen tarda en cargar o falla la carga al abrir la vista a pantalla completa? Debe mostrarse un estado de carga o el mismo marcador de imagen no disponible, sin dejar la pantalla en blanco o con error visible al usuario.
- ¿Qué ocurre si el usuario toca la vista previa de un lugar bloqueado (premium) en el sheet de bloqueo? No debe abrirse ninguna vista a pantalla completa; la vista previa sigue mostrándose sin recortar pero no es un punto de entrada a la vista ampliada (ver FR-009).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir al usuario tocar cualquier foto real (no un marcador/placeholder) de contenido desbloqueado, mostrada en tarjetas de listado o en la cabecera de la ficha de detalle, y abrir dicha foto en una vista a pantalla completa. Las vistas previas de contenido bloqueado/premium quedan excluidas (ver FR-009).
- **FR-002**: La vista a pantalla completa DEBE mostrar la imagen íntegra, respetando su proporción original, sin recortar ningún borde ni deformar el contenido.
- **FR-003**: El usuario DEBE poder cerrar la vista a pantalla completa mediante una acción sencilla (toque o control de cierre) y volver exactamente a la pantalla y estado desde los que la abrió.
- **FR-004**: En su contexto habitual (tarjetas de listado, cabecera de ficha), la foto DEBE mostrarse completa —sin recortar ninguna parte del contenido—, quedando toda la imagen dentro del área asignada aunque eso implique dejar espacio libre visible alrededor de ella, en lugar de recortarla para rellenar el hueco.
- **FR-005**: El sistema DEBE mostrar correctamente tanto fotos horizontales (la orientación predominante actual) como fotos verticales, en todos los contextos (tarjetas, ficha y vista a pantalla completa), sin recortar ni deformar ninguna de las dos orientaciones.
- **FR-006**: Cuando la proporción de una foto no coincida exactamente con el espacio disponible en su contenedor, el sistema DEBE rellenar el espacio sobrante con un fondo neutro en lugar de recortar o estirar la imagen para que encaje.
- **FR-007**: El comportamiento actual de mostrar un marcador/placeholder cuando no existe una foto real DEBE mantenerse sin cambios funcionales; el placeholder no es una foto real y por tanto no abre la vista a pantalla completa.
- **FR-008**: El sistema DEBE mostrar el mismo marcador de "imagen no disponible" (o un estado de carga equivalente) si la foto no puede cargarse dentro de la vista a pantalla completa, evitando dejar la pantalla vacía o en estado de error sin explicación.
- **FR-009**: La vista previa de imagen mostrada en el sheet de bloqueo (contenido premium) DEBE seguir mostrándose sin recortar su contenido, pero NO DEBE ser tocable para abrir la vista a pantalla completa; el atajo a pantalla completa definido en FR-001 aplica únicamente a fotos de contenido desbloqueado, para no dar acceso a una versión ampliada del contenido de pago antes de comprarlo.

### Key Entities

*(No se introducen nuevas entidades de datos: esta funcionalidad cambia cómo se presentan las fotografías existentes, no la información almacenada sobre ellas.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las fotos mostradas en cualquier punto de la app (tarjetas, ficha, vista a pantalla completa) se ven con su encuadre completo, sin ningún borde recortado, verificado sobre el catálogo de fotos actual.
- **SC-002**: Desde cualquier foto visible en la app, el usuario puede alcanzar una vista completa y sin recortar de esa foto en un máximo de un toque, y volver a la pantalla anterior en un máximo de un toque/gesto adicional.
- **SC-003**: Al añadir una foto de orientación vertical al catálogo, esta se muestra completa y sin deformar en todos los lugares donde aparece (tarjeta, ficha, pantalla completa) sin que haga falta rediseñar esas pantallas para ese caso.
- **SC-004**: Una revisión visual del catálogo completo de fotos actuales no encuentra ningún caso de recorte de contenido relevante (personas, edificios, elementos clave de la composición) en tarjetas, ficha o vista a pantalla completa.

## Assumptions

- La mayoría de las fotos del catálogo actual son horizontales y comparten una proporción similar; las verticales son un caso futuro a soportar, no necesariamente el caso de diseño principal de hoy.
- Cuando una foto no llena completamente su contenedor por diferencia de proporción, se acepta dejar espacio de fondo neutro alrededor de la imagen (en vez de recortar o estirar) tanto en las vistas en contexto como en la vista a pantalla completa.
- La vista a pantalla completa no necesita, para esta funcionalidad, soportar zoom/paneo manual adicional más allá de encajar la imagen completa en pantalla; esto podría explorarse como mejora futura.
- El marcador/placeholder de "sin foto real" existente se mantiene igual y no es un destino de la vista a pantalla completa.
- El cambio de diseño de tarjetas y ficha es una cuestión de presentación (cómo se encaja la imagen en el layout existente), no requiere nuevas fuentes de datos ni cambios en el catálogo de contenidos.
