# Phase 1 — Contract: superficie de build y arranque

**Feature**: `001-app-skeleton-ci` | **Date**: 2026-09-01

Esta feature no expone API de red ni de librería. Su interfaz real —lo que otros consumen y
lo que rompe cosas al cambiar— es triple: los comandos de build, los nombres que enlazan
Kotlin con Xcode, y los puntos de entrada de cada plataforma. Este documento los fija.

Cambiar cualquier nombre de esta página rompe algo fuera del fichero donde se define. Ese
es el criterio para que esté aquí.

---

## 1. Comandos (consumidos por la persona desarrolladora y por CI)

Todos se ejecutan desde la raíz del repositorio, con el wrapper. No se soporta un Gradle
instalado en el sistema.

| Comando | Qué garantiza |
|---|---|
| `./gradlew allTests` | Ejecuta la batería de `commonTest` en el target Android (unit test JVM) y en `iosSimulatorArm64`. Es la orden de referencia de FR-007 |
| `./gradlew :composeApp:assembleDebug` | Produce el APK de depuración instalable (FR-001) |
| `./gradlew :composeApp:installDebug` | Instala en el dispositivo o emulador Android conectado |
| `./gradlew :composeApp:embedAndSignAppleFrameworkForXcode` | Invocado **por Xcode**, no a mano. Compila y embebe el framework en la app iOS |

**Estabilidad**: `allTests` y `assembleDebug` están referenciados en
`.github/workflows/ci.yml` y en el README. Renombrar el módulo `composeApp` obliga a
actualizar ambos.

## 2. Puente Kotlin ↔ Xcode

El acoplamiento más frágil del proyecto (D-003 en [research.md](../research.md)). Los cuatro
valores siguientes deben coincidir exactamente entre el build de Gradle y el proyecto Xcode:

| Elemento | Valor | Definido en | Consumido en |
|---|---|---|---|
| Nombre del módulo Gradle | `composeApp` | `settings.gradle.kts` | Run Script phase de Xcode |
| `baseName` del framework | `ComposeApp` | `composeApp/build.gradle.kts` | `import ComposeApp` en Swift |
| Tipo de framework | estático (`isStatic = true`) | `composeApp/build.gradle.kts` | configuración de enlazado de Xcode |
| Función de entrada expuesta | `MainViewControllerKt.MainViewController()` | `iosMain/.../MainViewController.kt` | `ContentView.swift` |

**Contrato de la Run Script build phase** (en el target `iosApp` de Xcode, antes de
"Compile Sources"): invoca `./gradlew :composeApp:embedAndSignAppleFrameworkForXcode`
heredando las variables de entorno de Xcode (`CONFIGURATION`, `SDK_NAME`, `ARCHS`,
`TARGET_BUILD_DIR`, `FRAMEWORKS_FOLDER_PATH`). Si esta fase se elimina o se reordena
después de la compilación, la app iOS deja de construirse. La compilación de iOS en CI
existe precisamente para detectar esa rotura (D-005).

## 3. Puntos de entrada por plataforma

| Plataforma | Punto de entrada | Contrato |
|---|---|---|
| Compartido | `App()` en `commonMain/.../App.kt` | `@Composable` sin parámetros. Es **la única** definición de la pantalla; ninguna plataforma define UI propia (FR-004) |
| Android | `MainActivity` (`androidMain`) | Actividad `LAUNCHER` declarada en el manifest; su `setContent` invoca `App()` y nada más |
| iOS | `MainViewController()` (`iosMain`) | Devuelve un `UIViewController` que envuelve `App()`; consumido desde `ContentView.swift` |

**Regla de paridad**: ambos hosts se limitan a arrancar `App()`. En el momento en que un
host añada comportamiento propio se estaría violando el principio I y la paridad de FR-004;
la revisión debe rechazarlo.

## 4. Contrato de la pantalla inicial

Comportamiento observable que las historias 1 y 2 verifican:

- Ocupa la pantalla completa y pinta el color de fondo del tema.
- Respeta las áreas seguras del sistema (notch, isla dinámica, barra de gestos): ningún
  contenido futuro quedará bajo elementos del sistema.
- Sigue la apariencia clara u oscura del sistema y cambia con ella.
- No muestra texto, logotipo ni controles.
- No realiza ninguna petición de red ni lectura de almacenamiento.

## 5. Contrato del pipeline de CI

**Disparadores**: `pull_request` contra cualquier rama y `push` a `main`.

**Resultado**: un único check visible en el cambio propuesto, con dos estados posibles —
éxito o fallo—, más el estado de error de infraestructura, distinguible por ser un fallo del
runner y no de un paso de verificación (edge case de la spec).

**Pasos, en orden de coste creciente** (falla rápido lo barato):

1. `./gradlew allTests`
2. `./gradlew :composeApp:assembleDebug`
3. `xcodebuild ... -scheme iosApp -destination 'generic/platform=iOS Simulator' build`

No hay paso de formato ni de análisis estático (D-006 en [research.md](../research.md)).

**Entorno**: runner `macos-latest`, JDK 21, cachés de Gradle y de Kotlin/Native
(`~/.konan`) restauradas entre ejecuciones.

**Contrato de diagnóstico** (FR-011): cuando el paso 1 falla, el log debe identificar la
prueba y el motivo sin necesidad de reproducir en local; los informes de test se publican
como artefacto de la ejecución.
