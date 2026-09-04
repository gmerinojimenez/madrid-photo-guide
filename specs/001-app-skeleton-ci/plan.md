# Implementation Plan: Esqueleto de aplicación multiplataforma con verificación automática

**Branch**: `001-app-skeleton-ci` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-app-skeleton-ci/spec.md`

## Summary

Crear la base del proyecto: una aplicación Kotlin Multiplatform con UI en Compose
Multiplatform que arranca en Android y en iOS hasta una pantalla vacía correctamente
compuesta, más un pipeline de GitHub Actions que verifica automáticamente cada cambio.

El enfoque es un único módulo Gradle compartido (`composeApp`) con la pantalla definida en
`commonMain` y consumida por un host Android (`Activity`) y un host iOS (proyecto Xcode que
enlaza el framework Kotlin). La batería de pruebas es `kotlin.test` en `commonTest` con la
prueba de ejemplo exigida por la spec, ejecutada en ambos targets con `./gradlew allTests`.
El pipeline corre en `macos-latest` y no solo pasa los tests: compila de verdad el APK y la
app iOS, porque en un proyecto KMP lo que se rompe en silencio es el pegamento de iOS, no
los tests.

Todas las versiones del toolchain se han verificado contra los repositorios reales; ver
[research.md](./research.md).

## Technical Context

**Language/Version**: Kotlin 2.4.10 (Multiplatform), Swift para el punto de entrada de iOS

**Primary Dependencies**: Compose Multiplatform 1.12.0, Android Gradle Plugin 9.4.0,
Gradle 9.7.1 (wrapper), androidx activity-compose 1.13.0. Sin herramienta de análisis
estático ni de formato (D-006)

**Storage**: N/A — esta feature no persiste nada

**Testing**: `kotlin.test` en `commonTest`, ejecutado vía `./gradlew allTests` sobre los
targets Android (JVM unit test) e `iosSimulatorArm64`

**Target Platform**: Android (`minSdk` 26, `compileSdk`/`targetSdk` 36) e iOS 16.0+
(`iosArm64`, `iosSimulatorArm64` — sin `iosX64`, ver research.md D-007)

**Project Type**: Aplicación móvil multiplataforma (KMP + Compose Multiplatform), sin
servidor

**Performance Goals**: pantalla inicial visible en menos de 2 s en gama media (SC-002);
pipeline de CI por debajo de 15 min en régimen estacionario (SC-005)

**Constraints**: sin backend propio ni servicios remotos en esta entrega; arranque sin red;
JDK 21; `macos-latest` obligatorio en CI por los targets de Apple

**Scale/Scope**: 1 módulo compartido, 1 pantalla vacía, 1 prueba de ejemplo, 1 workflow de
CI. Sin contenido de guía, navegación, telemetría, banderas ni compras (FR-014)

## Constitution Check

*GATE: evaluado antes de Phase 0 y reevaluado tras Phase 1.*

| Principio | Aplicación en esta feature | Estado |
|---|---|---|
| **I. KMP-First (lógica en `commonMain`)** | La pantalla raíz se define en `commonMain`. `androidMain`/`iosMain` contienen exclusivamente los hosts de arranque (`Activity`, `UIViewController`), que son integración de plataforma pura y no lógica duplicada. No se introduce ningún `expect/actual`. | ✅ PASS |
| **II. Serverless y cliente-primero** | No se añade backend ni servicio remoto. La app arranca sin red (FR-005, escenario 1.3). | ✅ PASS |
| **III. Testing por feature (NO NEGOCIABLE)** | Se entrega una prueba de ejemplo en `commonTest`, no tests de comportamiento ni de aceptación. | ⚠️ DESVIACIÓN JUSTIFICADA — ver Complexity Tracking |
| **IV. Firebase como plano de observabilidad** | No se integra Firebase en esta entrega. El principio no se incumple: no se añade ningún SDK alternativo de analítica, flags o crashes. La integración llega con la feature que la necesite. | ✅ PASS (no aplica todavía) |
| **V. Paridad funcional** | Ambas plataformas se entregan a la vez, con la misma pantalla compartida (FR-004, SC-007). CI compila y prueba las dos (D-005). | ✅ PASS |
| **VI. Freemium de compra única** | Sin cuentas, sin autenticación, sin facturación en esta entrega. No se introduce ninguna comprobación de acceso que pudiera duplicarse después. | ✅ PASS (no aplica todavía) |
| **Restricciones tecnológicas** | KMP + Gradle, targets Android/iOS, UI en Compose Multiplatform, versiones en un version catalog único sin versiones hardcodeadas en módulos. Sin secretos embebidos (no hay ninguno todavía). | ✅ PASS |
| **Puertas de CI** (constitución v1.1.0: compilación de todos los targets y tests) | El workflow cubre las tres: `allTests`, `assembleDebug`, `xcodebuild`. La puerta de análisis estático/formato ya no existe: se retiró de la constitución en la enmienda 1.1.0 realizada junto con este plan (ver D-006). | ✅ PASS |
| **Commits `feat:`/`fix:`** | Se respeta en la implementación. | ✅ PASS |

**Resultado de la puerta**: PASA con una desviación registrada y justificada (principio III).

**Reevaluación post-Phase 1**: sin cambios. El diseño no introdujo ningún elemento nuevo
que roce la constitución; en particular, la ausencia de `expect/actual` y de dependencias
directas a SDKs en `commonMain` se mantiene en el diseño final.

## Project Structure

### Documentation (this feature)

```text
specs/001-app-skeleton-ci/
├── plan.md              # Este fichero
├── spec.md              # Especificación de la feature
├── research.md          # Phase 0 — decisiones D-001..D-008 con versiones verificadas
├── data-model.md        # Phase 1 — sin entidades (documentado y razonado)
├── quickstart.md        # Phase 1 — guía de validación ejecutable
├── contracts/
│   └── build-interface.md   # Phase 1 — superficie de comandos y nombres estables
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 — lo genera /speckit-tasks, NO este comando
```

### Source Code (repository root)

```text
gradle/
├── libs.versions.toml           # Version catalog único (exigido por la constitución)
└── wrapper/
    ├── gradle-wrapper.jar
    └── gradle-wrapper.properties

composeApp/
├── build.gradle.kts             # Targets android + ios*, framework baseName
└── src/
    ├── commonMain/kotlin/com/gmj/madridphotoguide/
    │   ├── App.kt               # @Composable raíz: pantalla vacía, tema, safe areas
    │   └── theme/Theme.kt       # Tema claro/oscuro mínimo
    ├── commonMain/composeResources/   # Recursos compartidos (vacío por ahora)
    ├── androidMain/kotlin/com/gmj/madridphotoguide/
    │   └── MainActivity.kt      # Host Android: setContent { App() }
    ├── androidMain/AndroidManifest.xml
    ├── androidMain/res/          # Icono y nombre de la app
    ├── iosMain/kotlin/com/gmj/madridphotoguide/
    │   └── MainViewController.kt # Host iOS: ComposeUIViewController { App() }
    └── commonTest/kotlin/com/gmj/madridphotoguide/
        └── SmokeTest.kt          # Prueba de ejemplo (FR-007, FR-008)

iosApp/
├── iosApp.xcodeproj/            # Proyecto Xcode versionado
└── iosApp/
    ├── iOSApp.swift             # @main, punto de entrada
    ├── ContentView.swift        # Puente al UIViewController de Kotlin
    ├── Info.plist
    └── Assets.xcassets/         # Icono iOS

.github/workflows/
└── ci.yml                       # Workflow único: tests, APK, app iOS

build.gradle.kts                 # Raíz: plugins con apply false
settings.gradle.kts              # Repositorios e inclusión de :composeApp
gradle.properties                # Flags de Gradle/Kotlin/Android
local.properties                 # NO versionado — sdk.dir
.gitignore
README.md                        # Instrucciones de compilación (FR-013)
```

**Structure Decision**: se adopta la disposición de aplicación móvil multiplataforma con un
único módulo compartido `composeApp` (decisión D-001 de [research.md](./research.md)), más
`iosApp/` como host Xcode. Se descarta la modularización por capas hasta que exista dominio
real que separar: fijar fronteras de módulo sin código que las justifique es una apuesta a
ciegas que después se paga rehaciendo la configuración de build.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Principio III**: la feature se entrega con una prueba de ejemplo en lugar de tests unitarios de dominio y tests de aceptación | No existe todavía comportamiento de dominio ni interacción de usuario que probar: el entregable es que la app arranque y que la infraestructura de pruebas exista y se ejecute. La verificación de las historias 1 y 2 es manual en esta entrega, según el quickstart | Escribir tests de aceptación automatizados sobre "la app arranca" exigiría montar tests instrumentados en emulador y simulador —infraestructura de UI testing completa— para verificar una pantalla vacía. El coste es desproporcionado y la infraestructura habría que rehacerla al llegar la primera pantalla real. La deuda se salda en la primera feature con comportamiento, que sí traerá sus tests según el principio III |
