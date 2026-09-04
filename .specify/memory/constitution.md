<!--
SYNC IMPACT REPORT
==================
Version change: (plantilla sin rellenar) → 1.0.0
Motivo del bump: ratificación inicial. Se sustituyen todos los placeholders de la
plantilla por principios concretos del proyecto. Aún no existe código escrito bajo este
documento, por lo que las decisiones tomadas durante su redacción — incluido el cambio de
Kotlin Multiplatform a Expo / React Native — se consolidan en una única versión inicial en
lugar de arrastrar un historial de enmiendas.

Principios definidos (antes → después):
- [PRINCIPLE_1_NAME] → I. Núcleo Compartido: el dominio es TypeScript puro
- [PRINCIPLE_2_NAME] → II. Serverless y Cliente-Primero
- [PRINCIPLE_3_NAME] → III. Testing por Feature (NO NEGOCIABLE)
- [PRINCIPLE_4_NAME] → IV. Firebase como Plano de Observabilidad y Control
- [PRINCIPLE_5_NAME] → V. Paridad Funcional con UX Nativa
- (añadido) VI. Modelo Freemium de Compra Única

Secciones añadidas:
- [SECTION_2_NAME] → Restricciones Tecnológicas y de Plataforma
- [SECTION_3_NAME] → Flujo de Desarrollo y Puertas de Calidad

Secciones eliminadas: ninguna.

TODOs diferidos: ninguno.

Decisión registrada durante la redacción: las compras in-app se implementan con RevenueCat
(`react-native-purchases`), tras verificar el estado de las alternativas. Ello resuelve la
validación de recibo fuera del cliente sin operar servidor propio, y amplía el principio II
para admitir un segundo servicio gestionado acotado a titularidad de compra.
-->

# Madrid Photo Guide Constitution

## Core Principles

### I. Núcleo Compartido: el dominio es TypeScript puro

El proyecto es una única base de código Expo / React Native en TypeScript que produce las
apps de Android y de iOS. No existe un proyecto por plataforma.

La lógica de dominio — modelos, reglas de negocio, casos de uso, validación, parsing,
mapeadores, políticas de acceso y caché — DEBE vivir en un núcleo de TypeScript puro,
independiente de React, de React Native y de cualquier módulo nativo. Ese núcleo se
importa desde la UI, nunca al revés, y DEBE poder ejecutarse en Node sin simulador.

- La UI (componentes, hooks, navegación) consume el núcleo; no reimplementa reglas.
- Los módulos nativos y los SDKs se consumen SIEMPRE tras una interfaz definida en el
  núcleo. El dominio no importa `react-native`, ni `expo-*`, ni SDKs de Firebase o de la
  tienda.
- El código específico de plataforma se limita a lo inevitable: permisos, integraciones
  nativas y diferencias de presentación, resuelto con `Platform.select` o con sufijos
  `.ios.tsx` / `.android.tsx`. Cada bifurcación de plataforma DEBE justificarse en el PR.

Una regla de negocio duplicada entre plataformas, o filtrada dentro de un componente, es
una violación.

*Rationale*: el motivo de elegir Expo es tener un solo producto y no dos. La frontera que
lo protege ya no la impone el lenguaje, como ocurría con `commonMain` en KMP, así que hay
que sostenerla por disciplina: un núcleo sin dependencias de React ni de nativo es lo que
mantiene el dominio compartido, rápido de probar y ajeno a la plataforma.

### II. Serverless y Cliente-Primero

El proyecto NO tendrá servidor propio. No se escribirá, desplegará ni mantendrá backend
a medida (contenedores, VMs, APIs propias). Todo el comportamiento DEBE resolverse en el
cliente; lo que no pueda resolverse en cliente se apoyará exclusivamente en servicios
gestionados de terceros, hoy dos y solo dos:

- **Firebase** (Firestore, Storage, Remote Config) para contenido, observabilidad y flags.
- **RevenueCat** para la titularidad de compra y la validación de recibos, acotado a esa
  única responsabilidad.

Añadir un tercer servicio gestionado exige enmendar este principio. La prohibición firme es
mantener infraestructura propia, no consumir servicios de terceros: un servicio gestionado
se acepta cuando su alternativa sería operar un servidor.

La app DEBE ser usable sin conectividad para su función principal: el contenido de la
guía al que el usuario tiene acceso (localizaciones, fichas, imágenes ya vistas) se sirve
desde caché local, y la red es una mejora, no un requisito.

*Rationale*: es un proyecto personal de una sola persona; cualquier backend propio se
convierte en coste operativo permanente. Además, una guía fotográfica se usa en la calle,
donde la cobertura es poco fiable.

### III. Testing por Feature (NO NEGOCIABLE)

Ninguna feature se considera completa sin sus propios tests. Cada PR que añade o modifica
comportamiento DEBE incluir, en el mismo PR:

- **Tests unitarios** sobre el núcleo de dominio, ejecutados en Node con Jest. Sin red, sin
  I/O real, sin renderizado: las fuentes de datos externas se sustituyen por fakes. Al ser
  el núcleo TypeScript puro, estos tests DEBEN ser rápidos y no requerir simulador.
- **Tests de aceptación** que ejerciten el escenario de usuario descrito en la spec,
  renderizando la pantalla o el flujo completo con React Native Testing Library, con el
  backend y los módulos nativos falseados. Se interactúa como lo haría la persona usuaria
  (textos, roles, accesibilidad), nunca inspeccionando estado interno.

Los tests se escriben contra el comportamiento observable, no contra detalles de
implementación. Un cambio de refactor que rompe tests sin cambiar comportamiento indica
tests mal escritos y DEBE corregirse la prueba, no relajarla.

Corregir un bug requiere primero un test que lo reproduzca y falle.

Toda regla de acceso del principio VI (qué es gratuito y qué es de pago) DEBE estar
cubierta por tests unitarios explícitos, incluyendo como mínimo: usuario sin la compra,
usuario con la compra hecha, usuario que restaura la compra en una instalación limpia, y
estado de compra indeterminable por fallo de red o de tienda.

Lo que no puede probarse en JavaScript — la hoja de compra de la tienda, los permisos del
sistema — se cubre con una suite E2E mínima sobre build real y con la prueba manual de
publicación. No es excusa para dejar sin probar la lógica que rodea a esas piezas: esa
lógica vive en el núcleo y se prueba con fakes.

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
  tipado en el núcleo; está prohibido emitir eventos con strings sueltos en el punto de
  llamada.
- **Firebase Remote Config** para feature flags. Toda feature de usuario no trivial se
  entrega tras un flag con valor por defecto seguro embebido en el binario, de modo que la
  app funcione correctamente sin haber podido leer la configuración remota.
- **Firebase Crashlytics** para crashes y errores no fatales. Los stack traces DEBEN ser
  legibles en producción: cada build sube sus source maps.

Los tres se consumen a través de interfaces definidas en el núcleo; el código de dominio
NUNCA importa el SDK de Firebase. En tests se usan implementaciones en memoria, y ningún
test puede emitir tráfico real a Firebase.

RevenueCat aporta sus propios paneles de ingresos, que pueden usarse para el seguimiento
económico de la compra. Eso NO abre la puerta a usarlo como plataforma de analítica de
producto: el comportamiento dentro de la app se mide en Firebase Analytics y en ningún otro
sitio.

El ciclo de vida de los flags queda a discreción del proyecto: no hay obligación de
retirar un flag consolidado. La única regla firme es la del default seguro embebido.

*Rationale*: una única plataforma de telemetría evita SDKs redundantes en el binario y
mantiene el coste operativo en cero; el desacople por interfaces es lo que permite que el
principio III sea ejecutable. Sin source maps, un crash de JavaScript en producción es
ilegible y Crashlytics no sirve de nada.

### V. Paridad Funcional con UX Nativa

Android e iOS DEBEN ofrecer el mismo conjunto de funcionalidades y el mismo comportamiento
observable. Una feature no se da por entregada hasta estar disponible y probada en ambas
plataformas.

La paridad es de funcionalidad, no de píxeles: aunque la UI se comparta, cada plataforma
respeta sus convenciones de navegación, gestos, permisos, tipografía del sistema y áreas
seguras. Se acepta divergencia visual y de interacción; NO se acepta divergencia de
capacidades ni de reglas de negocio.

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
  tarjeta. El recibo emitido por la tienda es la única prueba de que la compra existe, y
  RevenueCat es quien lo valida y quien responde por la titularidad.
- **Restauración**: restaurar la compra DEBE estar disponible y encontrarse con facilidad
  en ambas plataformas, sin requerir soporte por parte del desarrollador. Al no haber
  cuentas, la restauración a través de la tienda es el ÚNICO mecanismo de recuperación de
  acceso, y por tanto es una funcionalidad crítica, no un extra.
- **Alcance del desbloqueo**: el desbloqueo vale para la cuenta de tienda que hizo la
  compra, dentro de su plataforma. Comprar en Android no desbloquea iOS ni al revés. Esta
  limitación es consecuencia aceptada de no tener cuentas y DEBE comunicarse con claridad
  al usuario antes de comprar.
- **Titularidad (entitlement)**: el acceso a contenido se decide en un único módulo del
  núcleo que responde a la pregunta "¿puede verse esto?". Ninguna pantalla, hook ni
  repositorio replica esa decisión por su cuenta. Las reglas de qué es gratuito viven en
  datos (configuración de contenido), no repartidas en condicionales del código.
- **Degradación segura**: si el estado de compra no puede determinarse (sin red, fallo de
  la tienda), la app CONSERVA el último estado conocido en lugar de revocar el acceso. Se
  prefiere conceder de más a un usuario legítimo antes que bloquear a quien ha pagado.
- **Contenido de pago en reposo**: el contenido premium no descargado no se almacena en el
  dispositivo. El contenido premium ya descargado por un usuario con derecho a él puede
  permanecer en caché para uso offline indefinidamente.

**Validación fuera del cliente**: el recibo de compra se valida en el servidor de
RevenueCat, no en el dispositivo. La app pregunta por la titularidad y confía en la
respuesta; NO reimplementa comprobaciones propias sobre el recibo ni intenta deducir la
titularidad por su cuenta. Si RevenueCat no responde, aplica la regla de degradación segura
del punto anterior.

*Rationale*: el pago único encaja con lo que la app es — una guía que se compra una vez y
se lleva encima — y elimina la caducidad, la renovación y la reconciliación de estados,
donde vive la mayor parte de los bugs de una monetización. Prescindir de cuentas elimina
además el registro, la recuperación de contraseña, el borrado de cuenta y el tratamiento
de datos personales: la tienda ya recuerda quién compró, así que una capa de identidad
propia solo añadiría fricción de producto y superficie de mantenimiento.

## Restricciones Tecnológicas y de Plataforma

- **Stack**: Expo (SDK gestionado) sobre React Native, en TypeScript con `strict` activado.
  Está PROHIBIDO el uso de `any` implícito y el silenciado de errores de tipo con
  `@ts-ignore` sin comentario justificativo. Plataformas objetivo: Android e iOS; el target
  web no se soporta.
- **Prebuild y código nativo**: se trabaja con generación nativa continua. Los directorios
  `ios/` y `android/` son artefactos de `expo prebuild` y NO se editan a mano ni se
  versionan. Toda configuración nativa se expresa mediante config plugins en la
  configuración de la app. Si una necesidad obliga a expulsarse del flujo gestionado, se
  documenta como decisión de arquitectura antes de hacerlo.
- **Firebase en Expo**: los SDKs nativos de Firebase requieren una development build; la
  app NO es ejecutable en Expo Go. El entorno de desarrollo asumido es una dev build
  propia, y esto se refleja en el README y en la configuración de CI.
- **Build y distribución**: EAS Build para binarios y EAS Submit para las tiendas. Los
  perfiles de build (desarrollo, preview, producción) se declaran en configuración
  versionada, no en pasos manuales.
- **Actualizaciones OTA**: EAS Update se permite para correcciones y ajustes que no cambien
  código nativo ni el conjunto de módulos nativos. Está PROHIBIDO usar OTA para introducir
  funcionalidad que no haya pasado por revisión de las tiendas, o para alterar el modelo de
  compra. Cada canal de OTA se corresponde con una versión de runtime concreta.
- **Dependencias**: `package.json` y el lockfile se versionan siempre. Las bibliotecas del
  ecosistema Expo se instalan con `expo install` para respetar las versiones compatibles
  con el SDK. Añadir una dependencia nueva requiere justificarla en el PR; se prefiere una
  API de la plataforma a una dependencia, y una dependencia mantenida a una abandonada.
- **Navegación**: una única solución de navegación para todo el proyecto, basada en rutas
  declarativas. Mezclar enfoques de navegación por feature está prohibido.
- **Facturación**: un único producto **no consumible**, comprado a través de Google Play
  Billing y StoreKit mediante **RevenueCat** (`react-native-purchases`), integrado con su
  config plugin. Está PROHIBIDO integrar pasarelas de pago de terceros o cobrar el
  desbloqueo fuera de las tiendas. La biblioteca requiere development build, en línea con lo
  ya exigido por Firebase.
  El núcleo define su propia interfaz de titularidad y RevenueCat es un detalle de
  implementación detrás de ella: ningún módulo de dominio, pantalla o hook importa el SDK
  directamente, de modo que sustituir el proveedor no obligue a tocar reglas de negocio.
  La clave pública de RevenueCat puede vivir en el bundle; ninguna clave secreta lo hace.
- **Estado de desbloqueo**: se persiste localmente en almacenamiento de la app y se
  reconcilia con la tienda al arrancar y al volver a primer plano. El almacenamiento local
  es una caché de conveniencia, nunca la autoridad: ante discrepancia con una consulta a la
  tienda que sí ha respondido, manda la tienda.
- **Datos**: la fuente de verdad de contenido de la guía es remota (Firebase) con caché
  local persistente en el dispositivo, y las imágenes en almacenamiento de ficheros, no en
  la base de datos local. El esquema de contenido se versiona e incluye la marca de gratuito
  o premium de cada pieza; el cliente DEBE degradar con elegancia ante campos desconocidos o
  ausentes, nunca crashear. Ante una pieza de contenido sin marca de acceso legible, se
  trata como premium.
- **Secretos**: ninguna clave de API de terceros con coste o privilegio se embebe en el
  binario ni se expone al bundle de JavaScript, que es inspeccionable. Los ficheros de
  configuración de Firebase por plataforma se gestionan como parte del build y no se
  comparten fuera del repositorio.
- **Privacidad**: al no existir cuentas, la app no recoge ni almacena datos personales
  identificables. Los datos de localización y las fotos del usuario no salen del
  dispositivo salvo que el usuario lo solicite explícitamente. La analítica no registra
  identificadores personales ni coordenadas precisas del usuario. Los eventos de compra no
  incluyen datos de pago. Cualquier feature que introduzca recogida de datos personales
  DEBE tratarse como cambio de alcance y revisarse contra este principio.
- **Rendimiento en campo**: la app se diseña para uso en exteriores con red intermitente y
  batería limitada. Las imágenes se sirven en resoluciones adaptadas al dispositivo, las
  listas largas se virtualizan, y el trabajo en segundo plano se minimiza. Las animaciones
  y los gestos DEBEN evitar bloquear el hilo de JavaScript.

## Flujo de Desarrollo y Puertas de Calidad

- **Flujo por feature**: cada feature parte de una spec, seguida de plan y tasks antes de
  implementarse. La spec define los escenarios de usuario que se convertirán en los tests
  de aceptación exigidos por el principio III, e indica explícitamente si la feature es
  gratuita, de pago, o mixta.
- **Puertas de CI** (obligatorias para fusionar): comprobación de tipos de TypeScript,
  linter y formato, suite de tests unitarios, y suite de tests de aceptación. Un pipeline
  en rojo bloquea el merge; no se fusiona con fallos conocidos.
- **Commits**: solo se permiten los tipos `feat:` y `fix:`. `feat:` para comportamiento
  nuevo, flag nuevo o capacidad nueva; `fix:` para corrección de errores, limpieza,
  eliminación de código muerto o retirada de un flag consolidándolo en código.
- **Revisión**: todo cambio se revisa contra esta constitución. El revisor verifica
  explícitamente: dominio en el núcleo y libre de React y de módulos nativos, tests
  presentes en el mismo PR, paridad de plataformas, ausencia de importaciones directas de
  SDKs en el dominio, y que ninguna comprobación de acceso se haya duplicado fuera del
  módulo único del principio VI.
- **Publicación**: no se publica una versión con features a medias visibles sin proteger
  por flag. Cada release se acompaña de la subida de source maps, de la comprobación de que
  Crashlytics y Analytics reportan correctamente en la build de producción, y de una prueba
  manual en ambas tiendas de: compra, restauración en instalación limpia, y acceso al
  contenido premium sin conectividad tras haber comprado.

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

**Version**: 1.0.0 | **Ratified**: 2026-09-01 | **Last Amended**: 2026-09-01
