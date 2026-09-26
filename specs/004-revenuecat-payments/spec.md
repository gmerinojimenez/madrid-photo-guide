# Feature Specification: Compra única y desbloqueo de contenido premium

**Feature Branch**: `004-revenuecat-payments`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Quiero implementar el sistema de pagos con RevenueCat como se estableció en la constitución"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Desbloquear todo el contenido premium con una compra única (Priority: P1)

Como usuario de la guía, quiero comprar el desbloqueo completo con un único pago,
gestionado por la tienda de mi dispositivo, para acceder de forma permanente a todas las
localizaciones y fichas marcadas como premium sin tener que pagar de nuevo ni suscribirme.

**Why this priority**: es la funcionalidad que da sentido al negocio del proyecto. Sin
ella no existe forma de convertir el contenido gratuito en ingresos, y ninguna otra
historia de esta feature tiene valor si esta no funciona.

**Independent Test**: partiendo de una instalación sin compra, se completa el pago único
desde la hoja de compra nativa de la tienda y se comprueba que todas las localizaciones
marcadas como premium quedan accesibles de inmediato, sin reiniciar la app.

**Acceptance Scenarios**:

1. **Given** un usuario sin la compra realizada, **When** consulta una localización
   marcada como premium, **Then** el contenido aparece bloqueado y se le ofrece la opción
   de comprar el desbloqueo completo.
2. **Given** un usuario sin la compra realizada, **When** completa el pago único a través
   de la hoja de compra nativa, **Then** todas las localizaciones premium quedan
   accesibles sin necesidad de reiniciar la aplicación.
3. **Given** un usuario que ya ha completado la compra, **When** consulta cualquier
   localización premium, **Then** el contenido se muestra igual que el contenido
   gratuito, sin ninguna indicación de bloqueo.
4. **Given** un usuario que ya ha completado la compra, **When** vuelve a la pantalla de
   compra, **Then** el sistema le indica que el desbloqueo ya está activo y no le permite
   pagar una segunda vez.

---

### User Story 2 - Restaurar la compra en una instalación nueva (Priority: P1)

Como usuario que ya pagó el desbloqueo, quiero recuperar mi acceso premium en un
dispositivo nuevo o tras reinstalar la app, sin tener que contactar con soporte, para no
perder lo que ya he pagado.

**Why this priority**: al no existir cuentas de usuario, la restauración a través de la
tienda es el único mecanismo de recuperación de acceso. Es tan crítica como la compra en
sí: un fallo aquí convierte cualquier reinstalación en una pérdida de dinero para el
usuario.

**Independent Test**: se realiza la compra en una instalación, se desinstala y se vuelve a
instalar la app (o se instala en otro dispositivo con la misma cuenta de tienda), y se
comprueba que, tras solicitar la restauración, el contenido premium queda accesible sin
intervención del desarrollador.

**Acceptance Scenarios**:

1. **Given** una instalación nueva sin compra local registrada, **When** el usuario
   solicita restaurar sus compras, **Then** el sistema consulta a la tienda y, si existe
   una compra previa asociada a su cuenta, desbloquea el contenido premium.
2. **Given** una instalación nueva, **When** el usuario solicita restaurar sus compras y
   la tienda no encuentra ninguna compra asociada a su cuenta, **Then** el sistema informa
   con claridad de que no se ha encontrado ninguna compra que restaurar, sin desbloquear
   contenido.
3. **Given** un usuario que compró en una plataforma, **When** solicita restaurar en la
   otra plataforma (Android/iOS), **Then** el sistema no desbloquea el contenido y explica
   que el desbloqueo pertenece a la cuenta de tienda de la plataforma original.

---

### User Story 3 - Conservar el acceso cuando no se puede confirmar el estado de la compra (Priority: P2)

Como usuario que ya ha comprado el desbloqueo, quiero seguir viendo mi contenido premium
aunque no haya conexión o la tienda no responda, para poder usar la guía en la calle sin
que un problema de red me deje fuera de algo que ya pagué.

**Why this priority**: la app está pensada para uso en exteriores con conectividad poco
fiable. Revocar acceso por un fallo temporal de red o de tienda sería penalizar a un
usuario legítimo, algo que la constitución del proyecto prohíbe explícitamente.

**Independent Test**: con la compra ya realizada y el contenido premium accesible, se
simula la pérdida de conexión o un fallo de la tienda al arrancar la app, y se comprueba
que el contenido premium sigue accesible con el último estado conocido.

**Acceptance Scenarios**:

1. **Given** un usuario con la compra confirmada y almacenada localmente, **When** la app
   arranca sin conexión a internet, **Then** el contenido premium permanece accesible
   usando el último estado de compra conocido.
2. **Given** un usuario con la compra confirmada, **When** la app intenta reconciliar el
   estado con la tienda y la consulta falla, **Then** el sistema conserva el acceso
   premium en lugar de bloquearlo.
3. **Given** un usuario con la compra confirmada, **When** la conexión se restablece y la
   tienda confirma la compra, **Then** el estado local se mantiene consistente con la
   respuesta de la tienda.

---

### Edge Cases

- ¿Qué ocurre si el usuario cancela la hoja de compra nativa antes de completar el pago?
  El contenido premium permanece bloqueado y no se produce ningún cargo ni cambio de
  estado.
- ¿Qué ocurre si la tienda notifica una compra reembolsada o revocada? El sistema debe
  reflejar la pérdida de titularidad en la siguiente reconciliación con la tienda,
  volviendo a bloquear el contenido premium.
- ¿Qué ocurre si el usuario intenta comprar mientras una compra anterior sigue
  procesándose? El sistema debe evitar una segunda compra simultánea y esperar la
  resolución de la primera.
- ¿Qué ocurre si el dispositivo no tiene ninguna cuenta de tienda configurada (Google
  Play / App Store)? El sistema informa de que la compra no está disponible en ese
  momento, sin bloquear el resto de la app.
- ¿Qué ocurre si la tienda devuelve un error al consultar el catálogo de productos (por
  ejemplo, el producto no está disponible en el país del usuario)? El sistema informa del
  problema y mantiene accesible el contenido gratuito.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer un único producto de compra, no consumible, que
  desbloquea de forma permanente todo el contenido marcado como premium en el catálogo de
  la guía.
- **FR-002**: El sistema DEBE decidir si una pieza de contenido es accesible a través de
  un único punto de decisión de titularidad; ninguna pantalla debe evaluar el acceso por
  su cuenta.
- **FR-003**: El sistema DEBE permitir completar la compra exclusivamente a través de la
  hoja de compra nativa de la tienda de la plataforma (Google Play / App Store), sin
  formularios de pago propios ni flujos web de checkout.
- **FR-004**: El sistema DEBE ofrecer una opción de "restaurar compras" accesible y visible
  en ambas plataformas, que recupere la titularidad sin intervención del desarrollador.
- **FR-005**: El sistema DEBE informar con claridad cuando una restauración no encuentra
  ninguna compra asociada a la cuenta de tienda del usuario.
- **FR-006**: El sistema DEBE impedir que un usuario con la compra ya activa vuelva a
  pagar por el mismo desbloqueo.
- **FR-007**: El sistema DEBE conservar el último estado de titularidad conocido cuando no
  pueda confirmarse el estado actual de la compra (sin red o fallo de la tienda), en lugar
  de revocar el acceso.
- **FR-008**: El sistema DEBE reconciliar el estado de titularidad con la tienda al
  arrancar la app y al volver a primer plano, y DEBE dar prioridad a la respuesta de la
  tienda sobre el estado guardado localmente cuando ambos difieren.
- **FR-009**: El sistema DEBE comunicar al usuario, antes de completar la compra, que el
  desbloqueo aplica únicamente a la cuenta de tienda y a la plataforma en la que se
  realiza.
- **FR-010**: El sistema NO DEBE almacenar ni transmitir datos de pago (número de tarjeta u
  otros datos financieros); la validación del recibo de compra se delega íntegramente en
  el proveedor de gestión de compras.
- **FR-011**: El sistema DEBE reflejar la pérdida de titularidad (por ejemplo, tras un
  reembolso) en cuanto la tienda la comunique, volviendo a bloquear el contenido premium.
- **FR-012**: Los eventos de analítica relacionados con la compra NO DEBEN incluir datos
  de pago ni identificadores personales del usuario.

### Key Entities *(include if feature involves data)*

- **Titularidad de compra (entitlement)**: representa si el usuario tiene o no acceso al
  contenido premium en este momento. Tiene un estado (activa / no activa / desconocida) y
  una fuente (respuesta reciente de la tienda vs. último valor conocido en caché local).
- **Producto de desbloqueo**: el único artículo comprable de la guía; no consumible, sin
  variantes, sin caducidad. Su precio y disponibilidad los define la tienda de cada
  plataforma.
- **Pieza de contenido**: cualquier localización o ficha de la guía marcada como gratuita
  o premium en el catálogo existente; esta feature no redefine el catálogo, solo consume
  su marca de acceso para decidir si mostrarla bloqueada o abierta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede completar la compra del desbloqueo completo, desde que pulsa
  comprar hasta que ve el contenido premium accesible, en menos de 30 segundos con
  conexión normal.
- **SC-002**: El 100% de las restauraciones de compra sobre una cuenta de tienda con una
  compra previa válida recuperan el acceso premium sin intervención manual del
  desarrollador.
- **SC-003**: Un usuario que ya compró el desbloqueo mantiene acceso al contenido premium
  en el 100% de los arranques de la app sin conexión, mientras no se le haya revocado la
  compra en la tienda.
- **SC-004**: Cero incidencias registradas de usuarios que, habiendo pagado, pierden acceso
  al contenido premium por fallos de red o de la tienda.
- **SC-005**: Ningún evento de analítica ni registro de errores generado por esta feature
  contiene datos de pago o identificadores personales.

## Assumptions

- El catálogo de contenido ya distingue, para cada pieza, si es gratuita o premium (según
  la feature `002-content-data-schema`), y esta feature consume esa marca en lugar de
  redefinirla.
- El precio y la disponibilidad geográfica del producto de desbloqueo se configuran en las
  consolas de Google Play, App Store y del proveedor de gestión de compras, y quedan fuera
  del alcance de esta especificación.
- No existen cuentas de usuario ni inicio de sesión en la app; la identidad a efectos de
  compra es la de la cuenta de tienda del dispositivo, no una identidad propia de la app.
- La reconciliación del estado de compra ocurre en primer plano (arranque y vuelta a
  primer plano); no se asume sincronización en segundo plano mientras la app está cerrada.
- El diseño visual de la pantalla de compra, del bloqueo de contenido y del botón de
  restauración se resuelve en una feature de UI posterior; esta especificación cubre el
  comportamiento, no la presentación.
