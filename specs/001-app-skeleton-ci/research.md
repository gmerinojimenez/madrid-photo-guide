# Phase 0 — Research: Esqueleto de aplicación multiplataforma con verificación automática

**Feature**: `001-app-skeleton-ci` | **Date**: 2026-09-01

Todas las versiones de este documento se han consultado contra los repositorios reales
(`repo1.maven.org`, `dl.google.com`, `services.gradle.org`) el 2026-09-01, no de memoria.
El toolchain local se ha inspeccionado directamente.

## Entorno verificado en la máquina de desarrollo

| Elemento | Valor observado |
|---|---|
| JDK | OpenJDK 21.0.2 (Zulu 21.32) |
| Xcode | 26.6 (build 17F113) |
| Runtimes iOS de simulador | 26.4, 26.5 |
| Android SDK | platforms 30–36.1, build-tools hasta 36.1.0, `cmdline-tools/latest`, NDK presente |
| `ANDROID_HOME` | **no exportada** (el SDK está en `~/Library/Android/sdk`) |
| Gradle / kotlinc en PATH | ausentes (se usará el wrapper de Gradle) |
| Remoto git | `git@github.com:gmerinojimenez/madrid-photo-guide.git` (GitHub) |

**Consecuencia**: GitHub Actions es la plataforma de CI correcta (FR-009), y no hay que
instalar Gradle: el wrapper es la única entrada soportada. `ANDROID_HOME` ausente debe
cubrirse con `local.properties` (no versionado) documentado en el quickstart.

---

## D-001: Estructura del proyecto

**Decisión**: un único módulo Gradle compartido `composeApp` con `commonMain`,
`androidMain`, `iosMain` y `commonTest`, más un proyecto Xcode `iosApp/` que consume el
framework producido por ese módulo. La aplicación Android es el propio módulo
`composeApp` con su `AndroidManifest.xml`.

**Rationale**: es la disposición canónica del asistente de Kotlin Multiplatform y la más
barata de mantener por una sola persona. El principio I (lógica en `commonMain`) queda
estructuralmente favorecido: `commonMain` es el destino por defecto, y escribir en
`androidMain`/`iosMain` es la desviación explícita.

**Alternativas consideradas**:
- *Multi-módulo por capas (`:domain`, `:data`, `:ui`) desde el inicio*: rechazado. Todavía
  no hay dominio que separar; la modularización sin código real fija fronteras a ciegas y
  añade configuración de build que habría que rehacer. Se introducirá cuando el contenido
  de la guía dé señales de dónde están las costuras.
- *Un módulo `shared` sin UI + apps por plataforma*: rechazado. Es la disposición previa a
  Compose Multiplatform; con UI compartida obliga a un módulo extra sin aportar nada.

---

## D-002: Versiones del toolchain

**Decisión**: fijar en un único version catalog (`gradle/libs.versions.toml`, exigido por
la constitución) las siguientes versiones, todas estables y verificadas hoy:

| Componente | Versión | Fuente consultada |
|---|---|---|
| Kotlin | `2.4.10` | `repo1.maven.org` — última estable (2.4.20 solo en Beta/RC) |
| Compose Multiplatform | `1.12.0` | `repo1.maven.org` — última estable |
| Android Gradle Plugin | `9.4.0` | `dl.google.com` — última estable (9.5.0 en alpha) |
| Gradle | `9.7.1` | `services.gradle.org/versions/current` |
| androidx activity-compose | `1.13.0` | `dl.google.com` |
| JDK de compilación | `21` | instalado localmente; LTS |

**Riesgo abierto y cómo se cerró (actualizado en T008 de la implementación)**: la
incompatibilidad real no fue Kotlin↔Compose, sino **AGP↔KMP**: AGP 9.4.0 rompe la
combinación clásica `com.android.application` + `org.jetbrains.kotlin.multiplatform` (deja
de soportarla de forma nativa desde AGP 9.0, empujando hacia un plugin de librería que no
sirve para producir una app instalable). Bajar a AGP 8.13.2 tampoco fue viable: AGP 8.x usa
una API interna de Gradle retirada en Gradle 9.6, e incompatible por tanto con Gradle 9.7.1.

Se resolvió manteniendo AGP 9.4.0 y Gradle 9.7.1 (las versiones ya fijadas) y activando en
`gradle.properties` las dos flags de compatibilidad que el propio mensaje de error de AGP
señala como solución: `android.builtInKotlin=false` y `android.newDsl=false`. Con ellas el
build sincroniza y `allTests` corre en ambos targets sin más cambios.

**Coste asumido**: son flags de compatibilidad temporal, no la vía recomendada a largo
plazo por Google (que es migrar a `com.android.kotlin.multiplatform.library`, hoy pensado
para librerías, no para apps). Se reevaluará cuando exista un plugin de aplicación KMP de
primera clase para AGP 9.x.

**Alternativas consideradas**: usar versiones más conservadoras (Kotlin 2.2.x / CMP 1.8.x).
Rechazado: el proyecto nace hoy y no tiene deuda que arrastrar; empezar dos años por detrás
solo adelanta la primera migración forzosa.

---

## D-003: Integración de iOS (cómo consume Xcode el código Kotlin)

**Decisión**: proyecto Xcode versionado en `iosApp/`, que enlaza un framework estático
producido por el módulo `composeApp`, embebido mediante una *Run Script build phase* que
invoca la tarea Gradle `embedAndSignAppleFrameworkForXcode`. El punto de entrada Swift crea
un `UIViewController` devuelto desde Kotlin.

**Rationale**: es el mecanismo soportado de primera clase por el plugin de Kotlin
Multiplatform. No introduce gestor de dependencias adicional, no requiere Ruby ni
CocoaPods en la máquina ni en CI, y mantiene el proyecto Xcode como artefacto legible y
versionado.

**Alternativas consideradas**:
- *CocoaPods (`kotlin("native.cocoapods")`)*: rechazado. Añade Ruby, un `Podfile` y un
  paso `pod install` al arranque y a CI, a cambio de una integración que ahora mismo no
  necesitamos (no hay dependencias nativas de terceros).
- *Swift Package Manager con framework prebuilt*: rechazado por ahora. Obliga a publicar o
  a versionar un binario, lo que complica el bucle de desarrollo local sin beneficio
  mientras solo haya un consumidor.

**Consecuencia para CI**: la Run Script phase es la pieza más frágil de toda la
configuración (se rompe en silencio al renombrar el módulo, cambiar el baseName del
framework o mover el proyecto). Justifica compilar la app iOS en CI — ver D-005.

---

## D-004: Pruebas

**Decisión**: `kotlin.test` en `composeApp/src/commonTest`, ejecutado con `./gradlew allTests`,
que abarca los targets Android (unit tests JVM) e `iosSimulatorArm64`. La prueba de ejemplo
exigida por FR-007 vive en `commonTest` (FR-008).

**Rationale**: `kotlin.test` viene con Kotlin, no añade dependencia, y `allTests` es la
tarea agregadora estándar: una sola orden ejecuta la batería en todos los targets, que es
justamente lo que exige la paridad del principio V. Verificar que la prueba compartida
corre *en ambos targets* es lo que hace de este esqueleto una base multiplataforma real y
no una app Android con una carpeta iOS al lado.

**Alternativas consideradas**:
- *JUnit5 + un target JVM añadido solo para tests*: rechazado. Un target extra que no se
  publica es superficie de build sin usuario.
- *Kotest*: rechazado por ahora. Aporta aserciones más expresivas, pero es una dependencia
  que hay que justificar; `kotlin.test` basta hasta que haya comportamiento real.

**Nota de constitución**: el principio III exige tests unitarios y de aceptación por
feature. Aquí solo se entrega la prueba de ejemplo porque no hay comportamiento de dominio
todavía; la verificación de las historias 1 y 2 (arranque) es manual en esta entrega, según
lo ya registrado en las Assumptions de la spec. Ver la sección Constitution Check del plan.

---

## D-005: Alcance del pipeline de CI

**Decisión**: un único workflow de GitHub Actions, un solo job sobre `macos-latest`,
disparado por `pull_request` y por `push` a `main`, con estos pasos de verificación:

1. `./gradlew allTests` — batería compartida en Android e iOS simulador.
2. `./gradlew :composeApp:assembleDebug` — empaquetado real del APK.
3. `xcodebuild -project iosApp/iosApp.xcodeproj -scheme iosApp -destination 'generic/platform=iOS Simulator' build` — compilación real de la app iOS.

No hay paso de formato ni de análisis estático: ver D-006.

**Rationale**: la spec dejó abierto (Assumptions) si la CI debía cubrir la compilación
completa de ambas plataformas. La respuesta es sí, por una razón concreta: en un proyecto
KMP con iOS, lo que se rompe no son los tests, es el pegamento — la Run Script phase, el
baseName del framework, el `deployment target`, la firma. Los tests pasarían en verde
mientras la app iOS lleva semanas sin compilar. Un pipeline que no compila iOS no protege
FR-002 ni el principio V, que es exactamente el fallo que esta feature existe para prevenir.

**Runner**: `macos-latest` es obligatorio, no una preferencia — los targets de Kotlin/Native
para Apple y `xcodebuild` solo existen ahí. Ejecutar la parte JVM en `ubuntu` en un job
aparte se rechaza: duplicaría la restauración de caché de Gradle para ahorrar un par de
minutos en un repositorio de un solo desarrollador, y multiplicaría los puntos de fallo.

**Coste frente a SC-005 (<15 min)**: con caché de Gradle y de Konan tibia, la ejecución
estimada queda holgadamente por debajo. La primera ejecución (cachés frías, descarga del
toolchain de Kotlin/Native) será notablemente más lenta y es esperada; si el régimen
estacionario superase los 15 minutos, la primera palanca es recortar el paso 3 a
compilación incremental, no eliminar la cobertura de iOS.

**Alternativas consideradas**:
- *Solo `allTests`, sin compilar apps*: rechazado por lo argumentado arriba.
- *Matriz de dos jobs (ubuntu para JVM, macOS para iOS)*: rechazado; coste de complejidad
  superior al ahorro.
- *Añadir tests instrumentados en emulador/simulador*: rechazado en esta entrega. No hay
  comportamiento de UI que probar más allá de "arranca", y el coste en tiempo de CI es
  desproporcionado. Entra cuando entre la primera feature con interacción.

---

## D-006: Análisis estático y formato — retirado

**Decisión**: **no se añade ninguna herramienta de análisis estático ni de formato** en esta
feature. Sin Spotless, sin ktlint, sin detekt. El pipeline no tiene paso de estilo.

**Contexto**: la constitución v1.0.0 exigía "análisis estático / formato" como puerta de CI
obligatoria. La investigación mostró que satisfacerla hoy solo era posible con herramienta
desfasada o en alpha: detekt estable (`1.23.8`) está construido sobre el compilador de
Kotlin 1.9 y frente a Kotlin 2.4 queda sin resolución de tipos, y detekt 2.0 solo existe en
`alpha.6`. La alternativa evaluada fue Spotless `8.10.1` + ktlint `1.8.0`, que sí están al
día pero cubren formato, no análisis estático.

**Resolución**: en lugar de cumplir la puerta con una herramienta que ya nace endeudada, se
**enmendó la constitución a la versión 1.1.0** retirando esa puerta. Las puertas
obligatorias de CI quedan en tres: compilación de todos los targets, tests unitarios de
`commonTest` y tests de aceptación.

**Rationale**: una puerta de calidad que solo puede satisfacerse mal no es una puerta de
calidad, es un trámite. Es preferible no tenerla, dejarlo escrito, y reintroducirla cuando
exista herramienta adecuada —momento en el que volverá a ser una enmienda deliberada y no
una decisión tomada de paso dentro de una feature.

**Coste asumido**: el proyecto crece sin verificación automática de estilo. Cuando se
reintroduzca, el primer cambio será un diff de reformateo amplio sobre el código ya escrito.
Se acepta conscientemente: el volumen de código de un proyecto de una persona hace que ese
coste sea manejable.

**Revisión futura**: reconsiderar cuando detekt 2.x llegue a estable. Reintroducir la puerta
exige enmendar la constitución, no basta con añadir un paso al workflow.

---

## D-007: Identidad y configuración de la app

**Decisión**:

| Parámetro | Valor |
|---|---|
| Application ID / Bundle ID | `com.gmj.madridphotoguide` |
| Nombre visible | `Madrid Photo Guide` |
| Android `minSdk` | 26 |
| Android `compileSdk` / `targetSdk` | 36 |
| iOS deployment target | 16.0 |
| Targets Kotlin/Native | `iosArm64`, `iosSimulatorArm64` |
| Icono | marcador de posición generado, distinguible en el lanzador |

**Rationale**: el identificador de aplicación es la decisión más cara de revertir de toda
la lista — una vez publicado en cualquiera de las dos tiendas es inmutable. Se elige ahora,
en frío, derivándolo del propietario del repositorio. `minSdk 26` y iOS 16.0 son
"razonablemente actuales" según la constitución, cubren la práctica totalidad del parque de
dispositivos en uso y evitan compatibilidades históricas que nadie va a ejercitar.

**Actualizado en la implementación**: Compose Multiplatform 1.12.0 no publica artefactos
para `iosX64` (resolución de dependencias falla en `appleMain` para ese target). Retirado
de la lista de targets. Es coherente con el abandono de Intel en el ecosistema Apple; el
desarrollo y CI corren en Apple Silicon (`iosSimulatorArm64`), así que no se pierde
cobertura real de la única máquina en la que hoy se compila y prueba iOS.

**Bundle ID**: `com.gmj.madridphotoguide`, confirmado.

---

## D-008: Qué es exactamente "una pantalla en blanco"

**Decisión**: un `@Composable` raíz en `commonMain` que rellena la pantalla con el color de
fondo del tema, respeta las áreas seguras del sistema (notch, isla dinámica, barra de
gestos) y sigue la apariencia clara u oscura del sistema. Sin texto, sin logotipo, sin
navegación.

**Rationale**: la spec pide una pantalla vacía "correctamente compuesta". La diferencia
entre una vista vacía y una vista vacía *bien anclada* es que la segunda ya prueba que el
tema, los insets y el ciclo de vida están correctamente conectados en las dos plataformas —
que es lo único que esta feature tiene que demostrar. Una pantalla que ignora los insets
parece funcionar y falla en el primer contenido real.

**Alternativas consideradas**: mostrar un texto de "Hello World" o el nombre de la
plataforma. Rechazado: el usuario pidió explícitamente una pantalla en blanco, y un texto
de plantilla es contenido de marcador que después hay que acordarse de borrar.

---

## Incógnitas pendientes

Ninguna bloqueante. La única verificación diferida es la compatibilidad exacta
Kotlin ↔ Compose Multiplatform (D-002), que se resuelve en la primera ejecución del build.
