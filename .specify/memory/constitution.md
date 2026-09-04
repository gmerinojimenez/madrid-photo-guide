<!--
SYNC IMPACT REPORT (enmienda vigente)
=====================================
Version change: 1.0.0 → 1.1.0
Fecha: 2026-09-01
Motivo del bump: se retira la puerta de CI de "análisis estático / formato" de la sección
"Flujo de Desarrollo y Puertas de Calidad". Las puertas obligatorias quedan en tres:
compilación de todos los targets, tests unitarios de commonTest y tests de aceptación.

Justificación: al planificar la feature 001 se comprobó que no existe hoy una herramienta
de análisis estático de Kotlin al día con la versión del compilador en uso (detekt estable
sigue anclado al compilador de Kotlin 1.9 y su 2.x solo existe en alpha). Imponer una
puerta obligatoria que solo puede satisfacerse con herramienta desfasada o en alpha genera
deuda desde el primer commit. Se prefiere no tener la puerta a tenerla mal.

Clasificación del bump: MINOR y no MAJOR. Se retira un requisito de una sección de
gobernanza, no un principio: ninguno de los principios I–VI se elimina ni se redefine, y la
retirada es una relajación —nada que fuera conforme bajo 1.0.0 deja de serlo bajo 1.1.0—.

Secciones modificadas:
- "Flujo de Desarrollo y Puertas de Calidad" → puerta de análisis estático/formato retirada,
  con nota explícita de que reintroducirla requiere enmienda.

Principios modificados: ninguno.
Secciones añadidas o eliminadas: ninguna.

Consistencia con artefactos posteriores: specs/001-app-skeleton-ci (plan, research,
contracts y quickstart) actualizados en el mismo cambio para retirar el paso de formato del
pipeline. Sin otras dependencias.

---
HISTORIAL
=========
Version change: (plantilla sin rellenar) → 1.0.0
Motivo del bump: ratificación inicial. Se sustituyen todos los placeholders de la
plantilla por principios concretos del proyecto. Aún no existe código escrito bajo este
documento, por lo que las decisiones tomadas durante su redacción se consolidan en una
única versión inicial en lugar de arrastrar un historial de enmiendas.

Principios definidos (antes → después):
- [PRINCIPLE_1_NAME] → I. KMP-First: la lógica vive en commonMain
- [PRINCIPLE_2_NAME] → II. Serverless y Cliente-Primero
- [PRINCIPLE_3_NAME] → III. Testing por Feature (NO NEGOCIABLE)
- [PRINCIPLE_4_NAME] → IV. Firebase como Plano de Observabilidad y Control
- [PRINCIPLE_5_NAME] → V. Paridad Funcional con UX Nativa
- (añadido) VI. Modelo Freemium de Compra Única

Secciones añadidas:
- [SECTION_2_NAME] → Restricciones Tecnológicas y de Plataforma
- [SECTION_3_NAME] → Flujo de Desarrollo y Puertas de Calidad

Secciones eliminadas: ninguna.

TODOs diferidos:
- TODO(ENTITLEMENT_VERIFICATION): la verificación de compra es hoy client-side y por tanto
  eludible. Decisión pendiente entre asumir el riesgo de forma permanente o validar el
  recibo fuera del cliente. Ver principio VI.
-->

# Madrid Photo Guide Constitution

## Core Principles

### I. KMP-First: la lógica vive en commonMain

Toda lógica de dominio, casos de uso, modelos, validación, parsing, acceso a datos,
caché y presentación (ViewModels / state holders) DEBE implementarse en `commonMain`
de Kotlin Multiplatform. El código específico de plataforma (`androidMain`, `iosMain`)
se limita a: integración con SDKs nativos, permisos, facturación de la tienda, y
`expect/actual` para capacidades del sistema (localización, cámara, almacenamiento,
ciclo de vida).

Una funcionalidad duplicada en `androidMain` e `iosMain` es una violación salvo que se
justifique explícitamente en el PR como capacidad no compartible. Cualquier
`expect/actual` nuevo DEBE documentar por qué no puede resolverse en común.

*Rationale*: el objetivo del proyecto es una sola base de conocimiento de producto para
dos apps; permitir divergencia lógica por plataforma anula el motivo de elegir KMP y
duplica la superficie de bugs y de tests.

### II. Serverless y Cliente-Primero

El proyecto NO tendrá servidor propio. No se escribirá, desplegará ni mantendrá backend
a medida (contenedores, VMs, APIs propias). Todo el comportamiento DEBE resolverse en el
cliente; lo que no pueda resolverse en cliente se apoyará exclusivamente en servicios
gestionados de Firebase (Firestore, Storage, Remote Config).

La app DEBE ser usable sin conectividad para su función principal: el contenido de la
guía al que el usuario tiene acceso (localizaciones, fichas, imágenes ya vistas) se sirve
desde caché local, y la red es una mejora, no un requisito.

*Rationale*: es un proyecto personal de una sola persona; cualquier backend propio se
convierte en coste operativo permanente. Además, una guía fotográfica se usa en la calle,
donde la cobertura es poco fiable.

### III. Testing por Feature (NO NEGOCIABLE)

Ninguna feature se considera completa sin sus propios tests. Cada PR que añade o modifica
comportamiento DEBE incluir, en el mismo PR:

- **Tests unitarios** en `commonTest` para la lógica de dominio, casos de uso, mapeadores
  y state holders. Sin red, sin I/O real, sin dependencias de plataforma: las fuentes de
  datos externas se sustituyen por fakes.
- **Tests de aceptación** que ejerciten el escenario de usuario descrito en la spec de la
  feature, de extremo a extremo dentro del cliente (desde la intención de usuario hasta el
  estado observable), con backend falseado.

Los tests se escriben contra el comportamiento observable, no contra detalles de
implementación. Un cambio de refactor que rompe tests sin cambiar comportamiento indica
tests mal escritos y DEBE corregirse la prueba, no relajarla.

Corregir un bug requiere primero un test que lo reproduzca y falle.

Toda regla de acceso del principio VI (qué es gratuito y qué es de pago) DEBE estar
cubierta por tests unitarios explícitos, incluyendo como mínimo: usuario sin la compra,
usuario con la compra hecha, usuario que restaura la compra en una instalación limpia, y
estado de compra indeterminable por fallo de red o de tienda.

Está PROHIBIDO fusionar con tests deshabilitados, ignorados o marcados como skip sin un
issue enlazado que registre la deuda y su fecha de resolución.

*Rationale*: dos plataformas y un solo desarrollador significan que la regresión manual no
escala; la suite compartida es el único mecanismo realista de confianza al publicar. Los
errores en las reglas de acceso son además de los peores: o regalan contenido de pago, o
bloquean a quien ya ha pagado.

### IV. Firebase como Plano de Observabilidad y Control

Estadísticas, feature flags y crash reporting se hacen a través de Firebase, y solo de
Firebase. No se añadirán SDKs alternativos de analítica, experimentación o reporte de
errores.

- **Firebase Analytics** para eventos de producto. Los eventos se declaran en un catálogo
  tipado en `commonMain`; está prohibido emitir eventos con strings sueltos en el punto de
  llamada.
- **Firebase Remote Config** para feature flags. Toda feature de usuario no trivial se
  entrega tras un flag con valor por defecto seguro embebido en el binario, de modo que la
  app funcione correctamente sin haber podido leer la configuración remota.
- **Firebase Crashlytics** para crashes y errores no fatales.

Los tres se consumen a través de interfaces definidas en `commonMain`; el código de
dominio NUNCA depende directamente del SDK de Firebase. En tests se usan implementaciones
en memoria, y ningún test puede emitir tráfico real a Firebase.

El ciclo de vida de los flags queda a discreción del proyecto: no hay obligación de
retirar un flag consolidado. La única regla firme es la del default seguro embebido.

*Rationale*: una única plataforma de telemetría evita SDKs redundantes en el binario y
mantiene el coste operativo en cero; el desacople por interfaces es lo que permite que el
principio III sea ejecutable.

### V. Paridad Funcional con UX Nativa

Android e iOS DEBEN ofrecer el mismo conjunto de funcionalidades y el mismo comportamiento
observable. Una feature no se da por entregada hasta estar disponible y probada en ambas
plataformas.

La paridad es de funcionalidad, no de píxeles: aunque la UI se comparta vía Compose
Multiplatform, cada plataforma respeta sus convenciones de navegación, gestos, permisos y
tipografía del sistema. Se acepta divergencia visual y de interacción; NO se acepta
divergencia de capacidades ni de reglas de negocio.

La paridad incluye el modelo de negocio: el mismo contenido es gratuito y el mismo
contenido es de pago en ambas plataformas, con independencia de las diferencias de precio
o de mecánica de compra que imponga cada tienda.

Si una capacidad solo puede existir en una plataforma (limitación del sistema operativo o
de la tienda), se documenta en la spec de la feature y se protege con un flag, en lugar de
introducirla silenciosamente.

*Rationale*: una guía fotográfica se recomienda de boca en boca entre usuarios de ambos
sistemas; funcionalidades asimétricas convierten cada recomendación en una decepción.

### VI. Modelo Freemium de Compra Única

La app NO tiene cuentas de usuario ni autenticación. Una parte del contenido (un
subconjunto de fotos y de secciones de la guía) es gratuita y el resto se desbloquea con
**una única compra, de pago único y permanente**.

- **Sin cuentas**: no hay registro, ni login, ni perfil, ni sesión. Cualquier feature que
  parezca requerir identidad DEBE rediseñarse para funcionar sin ella o quedar fuera del
  alcance. Introducir autenticación exigiría enmendar este principio.
- **Sin suscripciones**: no hay pagos recurrentes, ni niveles, ni renovaciones, ni
  caducidad. La titularidad, una vez adquirida, no expira nunca.
- **Una sola compra desbloquea todo**: no se fragmenta el contenido de pago en compras
  separadas por zona, ruta o paquete. El producto de pago es uno.
- **La compra la gestiona la tienda**: el proceso de pago se delega íntegramente en Google
  Play y en la App Store, con sus propias hojas de compra nativas. La app no implementa
  pasarelas, formularios de pago, ni flujos web de checkout, y nunca ve ni maneja datos de
  tarjeta. La tienda es la única fuente de verdad de si la compra existe.
- **Restauración**: restaurar la compra DEBE estar disponible y encontrarse con facilidad
  en ambas plataformas, sin requerir soporte por parte del desarrollador. Al no haber
  cuentas, la restauración a través de la tienda es el ÚNICO mecanismo de recuperación de
  acceso, y por tanto es una funcionalidad crítica, no un extra.
- **Alcance del desbloqueo**: el desbloqueo vale para la cuenta de tienda que hizo la
  compra, dentro de su plataforma. Comprar en Android no desbloquea iOS ni al revés. Esta
  limitación es consecuencia aceptada de no tener cuentas y DEBE comunicarse con claridad
  al usuario antes de comprar.
- **Titularidad (entitlement)**: el acceso a contenido se decide en un único punto de
  `commonMain` que responde a la pregunta "¿puede verse esto?". Ninguna pantalla ni
  repositorio replica esa decisión por su cuenta. Las reglas de qué es gratuito viven en
  datos (configuración de contenido), no repartidas en condicionales del código.
- **Degradación segura**: si el estado de compra no puede determinarse (sin red, fallo de
  la tienda), la app CONSERVA el último estado conocido en lugar de revocar el acceso. Se
  prefiere conceder de más a un usuario legítimo antes que bloquear a quien ha pagado.
- **Contenido de pago en reposo**: el contenido premium no descargado no se almacena en el
  dispositivo. El contenido premium ya descargado por un usuario con derecho a él puede
  permanecer en caché para uso offline indefinidamente.

**Riesgo aceptado y decisión pendiente**: sin servidor propio, la validación del recibo de
compra ocurre en el cliente y es por tanto eludible por un usuario técnico. Se asume
conscientemente. Si la elusión se convierte en un problema medible, la respuesta será
validar el recibo fuera del cliente, no dispersar comprobaciones adicionales por la app.
TODO(ENTITLEMENT_VERIFICATION): decidir entre asumir el riesgo de forma permanente o
validar el recibo fuera del cliente.

*Rationale*: el pago único encaja con lo que la app es — una guía que se compra una vez y
se lleva encima — y elimina la caducidad, la renovación y la reconciliación de estados,
donde vive la mayor parte de los bugs de una monetización. Prescindir de cuentas elimina
además el registro, la recuperación de contraseña, el borrado de cuenta y el tratamiento
de datos personales: la tienda ya recuerda quién compró, así que una capa de identidad
propia solo añadiría fricción de producto y superficie de mantenimiento.

## Restricciones Tecnológicas y de Plataforma

- **Lenguaje y build**: Kotlin Multiplatform con Gradle. Targets soportados: Android e iOS
  (arm64 y simulador). Kotlin, AGP y las bibliotecas se declaran en un version catalog
  único; no se permiten versiones hardcodeadas en módulos.
- **UI**: **Compose Multiplatform**, compartida entre Android e iOS. La UI específica de
  plataforma se limita a lo que Compose Multiplatform no cubre bien (integraciones nativas,
  hojas del sistema, hoja de compra de la tienda). Introducir una pantalla escrita en
  SwiftUI o en Views de Android requiere justificarlo en el PR.
- **Cloud Functions**: no se usan por ahora. No están vetadas: si aparece una necesidad
  real (validación de recibos, secretos de terceros, escrituras privilegiadas), se
  introducen sin necesidad de enmendar esta constitución, respetando el principio II de no
  mantener servidor propio.
- **Facturación**: un único producto **no consumible** (Google Play Billing en Android,
  StoreKit en iOS), tras una interfaz común en `commonMain` resuelta con `expect/actual`.
  El dominio no conoce ninguna de las dos APIs. Está PROHIBIDO integrar pasarelas de pago
  de terceros o cobrar el desbloqueo fuera de las tiendas. La compra se confirma
  (acknowledge / finish transaction) siempre, para que la tienda no la revierta.
- **Estado de desbloqueo**: se persiste localmente en almacenamiento de la app y se
  reconcilia con la tienda al arrancar y al volver a primer plano. El almacenamiento local
  es una caché de conveniencia, nunca la autoridad: ante discrepancia con una consulta a la
  tienda que sí ha respondido, manda la tienda.
- **Datos**: la fuente de verdad de contenido de la guía es remota (Firebase) con caché
  local persistente. El esquema de contenido se versiona e incluye la marca de gratuito o
  premium de cada pieza; el cliente DEBE degradar con elegancia ante campos desconocidos o
  ausentes, nunca crashear. Ante una pieza de contenido sin marca de acceso legible, se
  trata como premium.
- **Secretos**: ninguna clave de API de terceros con coste o privilegio se embebe en el
  binario. Los ficheros de configuración de Firebase por plataforma se gestionan como
  parte del build y no se comparten fuera del repositorio.
- **Privacidad**: al no existir cuentas, la app no recoge ni almacena datos personales
  identificables. Los datos de localización y las fotos del usuario no salen del
  dispositivo salvo que el usuario lo solicite explícitamente. La analítica no registra
  identificadores personales ni coordenadas precisas del usuario. Los eventos de compra no
  incluyen datos de pago. Cualquier feature que introduzca recogida de datos personales
  DEBE tratarse como cambio de alcance y revisarse contra este principio.
- **Rendimiento en campo**: la app se diseña para uso en exteriores con red intermitente y
  batería limitada. Las imágenes se sirven en resoluciones adaptadas al dispositivo y el
  trabajo en segundo plano se minimiza.

## Flujo de Desarrollo y Puertas de Calidad

- **Flujo por feature**: cada feature parte de una spec, seguida de plan y tasks antes de
  implementarse. La spec define los escenarios de usuario que se convertirán en los tests
  de aceptación exigidos por el principio III, e indica explícitamente si la feature es
  gratuita, de pago, o mixta.
- **Puertas de CI** (obligatorias para fusionar): compilación de todos los targets, suite
  de tests unitarios de `commonTest`, y suite de tests de aceptación. Un pipeline en rojo
  bloquea el merge; no se fusiona con fallos conocidos. No hay puerta de análisis estático
  ni de formato: se retiró en la versión 1.1.0 de este documento por falta de herramienta
  al día para la versión de Kotlin en uso. Añadirla más adelante es una enmienda, no una
  decisión de feature.
- **Commits**: solo se permiten los tipos `feat:` y `fix:`. `feat:` para comportamiento
  nuevo, flag nuevo o capacidad nueva; `fix:` para corrección de errores, limpieza,
  eliminación de código muerto o retirada de un flag consolidándolo en código.
- **Revisión**: todo cambio se revisa contra esta constitución. El revisor verifica
  explícitamente: lógica en `commonMain`, tests presentes en el mismo PR, paridad de
  plataformas, ausencia de dependencias directas a SDKs en el dominio, y que ninguna
  comprobación de acceso se haya duplicado fuera del punto único del principio VI.
- **Publicación**: no se publica una versión con features a medias visibles sin proteger
  por flag. Cada release se acompaña de la comprobación de que Crashlytics y Analytics
  reportan correctamente en la build de producción, y de una prueba manual en ambas
  tiendas de: compra, restauración en instalación limpia, y acceso al contenido premium
  sin conectividad tras haber comprado.

## Governance

Esta constitución prevalece sobre cualquier otra práctica, convención o preferencia del
proyecto. Ante conflicto entre esta constitución y otra guía, gana la constitución.

**Enmiendas**: cualquier cambio a este documento se realiza mediante un PR dedicado que
incluye el texto nuevo, la justificación del cambio y el Sync Impact Report actualizado en
la cabecera del fichero. Las enmiendas no se mezclan con cambios de producto.

**Versionado**: se aplica versionado semántico al documento.
- **MAJOR**: se elimina o redefine un principio de forma incompatible con lo anterior.
- **MINOR**: se añade un principio o una sección, o se amplía materialmente una guía
  existente.
- **PATCH**: aclaraciones, correcciones de redacción y refinamientos sin cambio semántico.

**Cumplimiento**: cada PR y cada revisión verifican el cumplimiento de estos principios.
Toda complejidad añadida DEBE justificarse por escrito en el PR; en ausencia de
justificación, se elige la alternativa más simple. Una excepción a un principio requiere
enlazarse a un issue abierto que registre la deuda y su plan de resolución.

**Revisión periódica**: la constitución se relee al inicio de cada feature nueva para
comprobar que el plan propuesto la respeta. Si un principio bloquea repetidamente trabajo
legítimo, la respuesta correcta es enmendarlo, no ignorarlo.

**Version**: 1.1.0 | **Ratified**: 2026-09-01 | **Last Amended**: 2026-09-01
