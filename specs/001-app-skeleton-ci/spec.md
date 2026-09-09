# Feature Specification: Esqueleto de aplicación multiplataforma con verificación automática

**Feature Branch**: `001-app-skeleton-ci`

**Created**: 2026-09-01

**Status**: Completed (2026-09-09) — todas las tareas de [tasks.md](./tasks.md) verificadas; ver quickstart

**Input**: User description: "la primera tarea debe ser la base del proyecto, una app que pueda ejecutar en ambas plataformas. Aún no me preocupa el contenido, basta con que la app arranque y muestre una pantalla en blanco, pero ha de hacerlo en ambas plataformas. También debe tener una github action que ejecute los tests (de momento podemos dejar una clase de test con un test dummy)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arrancar la app en Android (Priority: P1)

Como desarrollador del proyecto, quiero instalar y abrir la aplicación en un dispositivo o
emulador Android y ver que arranca hasta una pantalla estable, para confirmar que existe
una base sobre la que construir las funcionalidades de la guía.

**Why this priority**: sin una app que arranque no hay nada que probar, demostrar ni
iterar. Es la mínima unidad de valor entregable del proyecto y el punto de partida de
todas las demás features.

**Independent Test**: se instala la app en un dispositivo Android limpio, se abre desde el
lanzador y se comprueba que muestra la pantalla inicial sin cerrarse. No depende de
ninguna otra historia.

**Acceptance Scenarios**:

1. **Given** un dispositivo Android compatible sin la app instalada, **When** se instala la
   aplicación y se abre desde el lanzador, **Then** la app muestra la pantalla inicial
   vacía y permanece abierta sin cerrarse ni mostrar errores.
2. **Given** la app abierta en la pantalla inicial, **When** se envía a segundo plano y se
   vuelve a traer a primer plano, **Then** la app sigue mostrando la pantalla inicial sin
   reiniciarse ni fallar.
3. **Given** un dispositivo sin conectividad de red, **When** se abre la aplicación,
   **Then** la app arranca igualmente hasta la pantalla inicial.

---

### User Story 2 - Arrancar la app en iOS (Priority: P1)

Como desarrollador del proyecto, quiero instalar y abrir la aplicación en un dispositivo o
simulador iOS y ver que arranca hasta la misma pantalla estable que en Android, para
confirmar que la base cumple la paridad de plataformas desde el primer día.

**Why this priority**: la paridad Android/iOS es un principio del proyecto y no se
retrofitea barato. Si la base solo funcionase en una plataforma, toda la arquitectura
posterior se construiría sobre una premisa falsa.

**Independent Test**: se instala la app en un dispositivo o simulador iOS limpio, se abre
desde la pantalla de inicio y se comprueba que muestra la misma pantalla inicial sin
cerrarse. No depende de la historia de Android más allá de compartir la definición de la
pantalla.

**Acceptance Scenarios**:

1. **Given** un dispositivo iOS compatible sin la app instalada, **When** se instala la
   aplicación y se abre desde la pantalla de inicio, **Then** la app muestra la pantalla
   inicial vacía y permanece abierta sin cerrarse ni mostrar errores.
2. **Given** la app abierta en la pantalla inicial, **When** se envía a segundo plano y se
   vuelve a traer a primer plano, **Then** la app sigue mostrando la pantalla inicial sin
   reiniciarse ni fallar.
3. **Given** la app abierta en Android y la app abierta en iOS, **When** se comparan ambas
   pantallas iniciales, **Then** ambas presentan el mismo contenido observable (una
   pantalla vacía) y ninguna ofrece capacidades que la otra no tenga.

---

### User Story 3 - Verificación automática en cada cambio (Priority: P2)

Como desarrollador del proyecto, quiero que cada cambio propuesto al repositorio dispare
automáticamente una verificación que ejecute la batería de pruebas y comunique el
resultado, para no tener que acordarme de ejecutarla a mano ni fusionar cambios rotos.

**Why this priority**: la app que arranca es el entregable; la verificación automática es
lo que impide que deje de arrancar. Aporta valor desde el primer commit, pero solo tiene
sentido una vez existe algo que verificar.

**Independent Test**: se propone un cambio cualquiera al repositorio y se comprueba que la
verificación se dispara sola, se ejecuta hasta el final y publica un resultado visible de
éxito o fallo.

**Acceptance Scenarios**:

1. **Given** el repositorio con la base del proyecto, **When** se propone un cambio,
   **Then** la verificación automática se dispara sin intervención manual y publica un
   resultado visible asociado a ese cambio.
2. **Given** una batería de pruebas que pasa por completo, **When** termina la
   verificación, **Then** el resultado publicado es de éxito.
3. **Given** una prueba que falla deliberadamente, **When** termina la verificación,
   **Then** el resultado publicado es de fallo e identifica qué prueba ha fallado.
4. **Given** la verificación ya lanzada para un cambio, **When** se envían nuevas
   modificaciones a ese mismo cambio, **Then** la verificación vuelve a ejecutarse sobre el
   contenido actualizado.

---

### Edge Cases

- **Primer arranque tras instalación limpia**: la app no dispone de ningún dato guardado
  previamente; debe arrancar igualmente sin errores.
- **Arranque sin conectividad**: no hay red disponible en el momento de abrir la app; el
  arranque no debe depender de ninguna respuesta remota.
- **Rotación y cambio de tamaño de pantalla**: la pantalla inicial debe seguir mostrándose
  correctamente al rotar el dispositivo o cambiar el tamaño de la ventana.
- **Modo claro y modo oscuro**: la pantalla inicial debe ser visualmente coherente en ambas
  apariencias del sistema, sin quedar ilegible ni mostrar zonas sin pintar.
- **Verificación sin cambios en el código de la app**: un cambio que solo toca
  documentación también debe producir un resultado de verificación concluyente, no un
  estado ambiguo.
- **Verificación interrumpida**: si la ejecución automática se cae por causas de
  infraestructura, el resultado debe distinguirse de un fallo de pruebas y poder relanzarse.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El proyecto DEBE producir una aplicación instalable y ejecutable en Android.
- **FR-002**: El proyecto DEBE producir una aplicación instalable y ejecutable en iOS,
  incluyendo simulador y dispositivo físico.
- **FR-003**: Al abrirse, la aplicación DEBE mostrar una pantalla inicial vacía, sin
  contenido de la guía, y permanecer estable en ella.
- **FR-004**: La pantalla inicial DEBE ser la misma definición compartida entre ambas
  plataformas, de modo que su contenido observable no diverja.
- **FR-005**: La aplicación DEBE arrancar sin requerir conectividad de red ni ninguna
  configuración previa por parte del usuario.
- **FR-006**: La aplicación DEBE presentarse con un nombre y un icono propios en el
  dispositivo, distinguibles en el lanzador de ambas plataformas.
- **FR-007**: El proyecto DEBE incluir una batería de pruebas automatizadas ejecutable
  desde línea de comandos, con al menos una prueba de ejemplo que demuestre que la
  infraestructura de pruebas funciona.
- **FR-008**: Las pruebas DEBEN residir en el ámbito compartido del proyecto, de forma que
  una única batería cubra el código común de ambas plataformas.
- **FR-009**: El repositorio DEBE disparar automáticamente la ejecución de la batería de
  pruebas ante cada cambio propuesto y ante cada actualización de la rama principal.
- **FR-010**: El resultado de la verificación automática DEBE ser visible en el propio
  cambio propuesto y distinguir con claridad éxito de fallo.
- **FR-011**: Cuando una prueba falla, la verificación DEBE reportar qué prueba ha fallado y
  por qué, sin obligar a reproducir el fallo en local para saberlo.
- **FR-012**: La verificación automática DEBE ser reproducible desde cero: partiendo de una
  copia limpia del repositorio, sin estado previo ni configuración manual.
- **FR-013**: El proyecto DEBE poder compilarse y probarse por una persona nueva siguiendo
  instrucciones escritas en el repositorio, sin conocimiento tácito.
- **FR-014**: El proyecto NO DEBE incluir en esta entrega contenido de la guía, pantallas de
  navegación, telemetría, banderas remotas ni mecánica de compra; esas capacidades llegan en
  features posteriores.

### Key Entities

No aplica: esta feature no introduce datos de dominio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La aplicación arranca hasta la pantalla inicial en el 100% de los intentos
  sobre una instalación limpia, en ambas plataformas, incluidos 10 arranques consecutivos
  sin cierres inesperados.
- **SC-002**: El tiempo desde que se abre la app hasta que la pantalla inicial es visible es
  inferior a 2 segundos en un dispositivo de gama media de cada plataforma.
- **SC-003**: Una persona que parte de un equipo sin el proyecto puede obtener una app
  instalable en ambas plataformas en menos de 30 minutos siguiendo únicamente las
  instrucciones del repositorio.
- **SC-004**: Cada cambio propuesto obtiene un resultado de verificación concluyente sin
  ninguna acción manual, en el 100% de los cambios.
- **SC-005**: La verificación automática completa su ejecución en menos de 15 minutos.
- **SC-006**: Un fallo introducido deliberadamente en una prueba se traduce siempre en un
  resultado de verificación en rojo que identifica la prueba afectada.
- **SC-007**: Las pantallas iniciales de Android e iOS son equivalentes en contenido
  observable: cero diferencias de capacidad entre plataformas.

## Assumptions

- **Alcance deliberadamente vacío**: "pantalla en blanco" se interpreta como una pantalla
  sin contenido de producto pero correctamente compuesta (respeta zonas seguras del
  sistema, y modo claro y oscuro). No se espera texto, ni logotipo, ni navegación.
- **Nombre e icono provisionales**: se asume un nombre e icono de marcador de posición
  suficientes para distinguir la app en el dispositivo; su diseño definitivo es trabajo
  posterior.
- **Versiones mínimas de sistema**: se asumen versiones mínimas de Android e iOS
  razonablemente actuales y ampliamente soportadas, fijadas durante la planificación; no
  hay requisito de compatibilidad con dispositivos antiguos en esta fase.
- **Prueba de ejemplo**: la prueba incluida es un marcador de posición que valida
  únicamente que la infraestructura de pruebas se ejecuta. Se sustituirá por pruebas reales
  de comportamiento en cuanto exista comportamiento que probar; no establece precedente para
  relajar la exigencia de pruebas por feature.
- **Pruebas de aceptación diferidas**: al no existir todavía comportamiento de usuario más
  allá de "la app arranca", la verificación de las historias 1 y 2 se hace de forma manual
  en esta entrega. La cobertura automatizada de escenarios de usuario empieza con la primera
  feature que introduzca comportamiento.
- **Verificación en la plataforma del repositorio**: se asume que la ejecución automática se
  apoya en el sistema de automatización del alojamiento del repositorio (GitHub Actions,
  según el enunciado), sin infraestructura propia que mantener.
- **Compilación de iOS en la verificación automática**: se asume que la verificación
  obligatoria de esta entrega cubre la ejecución de la batería de pruebas compartida. Ampliar
  la verificación a la compilación completa de ambas plataformas es deseable y se decidirá en
  la planificación según el coste de ejecución.
- **Sin servicios remotos en esta fase**: no se integra ningún servicio externo todavía, por
  lo que no se requieren credenciales ni ficheros de configuración de terceros para
  compilar y ejecutar.
- **Distribución fuera de alcance**: publicar en las tiendas, firmar builds de producción y
  gestionar perfiles de distribución no forman parte de esta entrega.
