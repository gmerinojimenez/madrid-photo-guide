---

description: "Task list for feature 001 — Esqueleto de aplicación multiplataforma con verificación automática"
---

# Tasks: Esqueleto de aplicación multiplataforma con verificación automática

**Input**: Design documents from `/specs/001-app-skeleton-ci/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/build-interface.md](./contracts/build-interface.md),
[quickstart.md](./quickstart.md)

**Tests**: la spec pide explícitamente "una clase de test con un test dummy" (FR-007,
FR-008), así que se incluye esa tarea. No se generan tests de aceptación automatizados: no
hay comportamiento de dominio todavía, y la desviación está registrada en el Complexity
Tracking de plan.md. La validación de arranque es manual, según quickstart.md.

**Organization**: las tareas se agrupan por historia de usuario para que cada una sea
implementable y verificable de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (ficheros distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1, US2, US3)
- Las rutas son relativas a la raíz del repositorio

## Path Conventions

Proyecto móvil multiplataforma según la estructura de plan.md: módulo compartido
`composeApp/`, host Xcode en `iosApp/`, workflow en `.github/workflows/`. Paquete Kotlin:
`com.gmj.madridphotoguide`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dejar el proyecto Gradle inicializado y compilando en vacío, con el toolchain
fijado y verificado.

- [X] T001 Crear `.gitignore` en la raíz cubriendo `build/`, `.gradle/`, `local.properties`, `.idea/`, `*.xcuserdatad`, `xcuserdata/` y `.DS_Store`
- [X] T002 Crear `local.properties` en la raíz con `sdk.dir=$HOME/Library/Android/sdk` y confirmar que NO queda versionado (`ANDROID_HOME` no está exportada en esta máquina, ver research.md)
- [X] T003 Generar el wrapper de Gradle 9.7.1 en `gradle/wrapper/` (`gradle-wrapper.jar`, `gradle-wrapper.properties`) y `gradlew`/`gradlew.bat` con permisos de ejecución
- [X] T004 Crear el version catalog `gradle/libs.versions.toml` con Kotlin 2.4.10, Compose Multiplatform 1.12.0, AGP 9.4.0 y androidx activity-compose 1.13.0 (versiones verificadas en research.md D-002); ninguna versión puede quedar hardcodeada en los módulos
- [X] T005 Crear `settings.gradle.kts` con `pluginManagement` y `dependencyResolutionManagement` (repositorios `google()`, `mavenCentral()`) e `include(":composeApp")`
- [X] T006 Crear `build.gradle.kts` en la raíz declarando los plugins del catalog con `apply false`
- [X] T007 Crear `gradle.properties` con `org.gradle.jvmargs`, `android.useAndroidX=true`, caché y configuración en paralelo de Gradle
- [X] T008 **Verificar el riesgo abierto de research.md D-002**: ejecutar `./gradlew --version` y una sincronización del proyecto para confirmar que Kotlin 2.4.10 y Compose Multiplatform 1.12.0 son compatibles. Si el build falla por la versión del compilador de Compose, bajar Kotlin a la versión que CMP 1.12.0 declare soportada y anotar el cambio en `gradle/libs.versions.toml` y en research.md D-002

**Checkpoint**: `./gradlew tasks` se ejecuta correctamente desde la raíz.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: el módulo compartido, la pantalla común y la infraestructura de pruebas. La
pantalla vive aquí, y no en US1 o US2, porque ambas historias la consumen: es exactamente
la pieza que garantiza FR-004 (una única definición compartida).

**⚠️ CRITICAL**: ninguna historia de usuario puede empezar hasta que esta fase esté completa.

- [X] T009 Crear `composeApp/build.gradle.kts` con el plugin de Kotlin Multiplatform, el target `androidTarget()` y los targets `iosArm64`, `iosSimulatorArm64` (`iosX64` retirado: CMP 1.12.0 no lo soporta, ver research.md D-007)
- [X] T010 Configurar en `composeApp/build.gradle.kts` el bloque `android` con `namespace` y `applicationId` = `com.gmj.madridphotoguide`, `compileSdk`/`targetSdk` 36, `minSdk` 26 y JDK 21
- [X] T011 Configurar en `composeApp/build.gradle.kts` el binario de framework iOS con `baseName = "ComposeApp"` e `isStatic = true`, y el `deployment target` 16.0 — los nombres deben coincidir exactamente con el apartado 2 de contracts/build-interface.md
- [X] T012 Declarar en `composeApp/build.gradle.kts` las dependencias de Compose Multiplatform (`runtime`, `foundation`, `material3`) en `commonMain` y `activity-compose` en `androidMain`, tomando las versiones del catalog
- [X] T013 [P] Crear el tema mínimo claro/oscuro en `composeApp/src/commonMain/kotlin/com/gmj/madridphotoguide/theme/Theme.kt`, derivando la apariencia del ajuste del sistema
- [X] T014 Crear el composable raíz `App()` en `composeApp/src/commonMain/kotlin/com/gmj/madridphotoguide/App.kt`: ocupa la pantalla completa, pinta el color de fondo del tema, respeta las áreas seguras del sistema y no muestra texto ni controles (contrato del apartado 4 de contracts/build-interface.md)
- [X] T015 [P] Declarar la dependencia de `kotlin.test` en el source set `commonTest` dentro de `composeApp/build.gradle.kts`
- [X] T016 [P] Crear la prueba de ejemplo en `composeApp/src/commonTest/kotlin/com/gmj/madridphotoguide/SmokeTest.kt` (FR-007, FR-008): una aserción trivial cuyo único cometido es demostrar que la infraestructura de pruebas se ejecuta
- [X] T017 Ejecutar `./gradlew allTests` y confirmar que la prueba corre **en ambos targets** (unit test de Android e `iosSimulatorArm64`), no solo en la JVM — validación 1 de quickstart.md

**Checkpoint**: la pantalla compartida y la batería de pruebas existen y se ejecutan. US1,
US2 y US3 pueden arrancar en paralelo desde aquí.

---

## Phase 3: User Story 1 — Arrancar la app en Android (Priority: P1)

**Goal**: instalar y abrir la app en Android y ver la pantalla inicial estable.

**Independent Test**: instalar en un dispositivo o emulador limpio, abrir desde el lanzador
y comprobar que muestra la pantalla vacía sin cerrarse. No depende de US2 ni de US3.

- [X] T018 [P] [US1] Crear `composeApp/src/androidMain/AndroidManifest.xml` declarando la aplicación y `MainActivity` como actividad `LAUNCHER`, con el nombre visible `Madrid Photo Guide`
- [X] T019 [US1] Crear el host Android en `composeApp/src/androidMain/kotlin/com/gmj/madridphotoguide/MainActivity.kt`: una `ComponentActivity` cuyo `setContent` invoca `App()` y nada más (regla de paridad del apartado 3 de contracts/build-interface.md)
- [X] T020 [US1] Habilitar el dibujado edge-to-edge en `MainActivity` para que las áreas seguras que respeta `App()` funcionen de verdad en Android
- [X] T021 [P] [US1] Añadir el icono de marcador de posición y las cadenas de nombre en `composeApp/src/androidMain/res/`
- [X] T022 [US1] Ejecutar `./gradlew :composeApp:assembleDebug` y confirmar que produce el APK instalable (FR-001)
- [X] T023 [US1] **Validación manual** (validación 2 de quickstart.md): instalar con `./gradlew :composeApp:installDebug` y comprobar los seis puntos — arranca y permanece estable, sobrevive a segundo plano y vuelta, arranca en modo avión, aguanta la rotación, sigue el cambio claro/oscuro, y no queda contenido bajo notch ni barra de gestos
- [X] T024 [US1] **Validación manual de criterios de éxito**: 10 arranques consecutivos sobre instalación limpia sin cierres (SC-001) y cronometrar el arranque hasta pantalla visible (SC-002, < 2 s)

**Checkpoint**: la app arranca y es estable en Android. Entregable demostrable por sí solo.

---

## Phase 4: User Story 2 — Arrancar la app en iOS (Priority: P1)

**Goal**: instalar y abrir la app en iOS y ver la misma pantalla estable que en Android.

**Independent Test**: instalar en un simulador o dispositivo limpio, abrir y comprobar que
muestra la pantalla vacía sin cerrarse. Comparte con US1 únicamente la pantalla común de la
fase 2.

**⚠️ Zona frágil**: los cuatro nombres del apartado 2 de contracts/build-interface.md
(`composeApp`, `ComposeApp`, framework estático, `MainViewControllerKt.MainViewController()`)
deben coincidir exactamente entre Gradle y Xcode. Es la causa habitual de fallo de esta fase.

- [X] T025 [US2] Crear el host iOS en `composeApp/src/iosMain/kotlin/com/gmj/madridphotoguide/MainViewController.kt`: una función `MainViewController()` que devuelve un `ComposeUIViewController { App() }` y nada más
- [X] T026 [US2] Crear el proyecto Xcode en `iosApp/iosApp.xcodeproj` con el target `iosApp`, `deployment target` 16.0 y bundle identifier `com.gmj.madridphotoguide`
- [X] T027 [US2] Añadir al target `iosApp` una *Run Script build phase*, situada **antes** de "Compile Sources", que invoque `./gradlew :composeApp:embedAndSignAppleFrameworkForXcode` heredando las variables de entorno de Xcode (`CONFIGURATION`, `SDK_NAME`, `ARCHS`, `TARGET_BUILD_DIR`, `FRAMEWORKS_FOLDER_PATH`)
- [X] T028 [US2] Configurar en el target `iosApp` la ruta de búsqueda del framework y el enlazado contra `ComposeApp`
- [X] T029 [P] [US2] Crear el punto de entrada `iosApp/iosApp/iOSApp.swift` con `@main`
- [X] T030 [US2] Crear `iosApp/iosApp/ContentView.swift` como puente al `UIViewController` de Kotlin (`import ComposeApp`), ignorando las áreas seguras en el contenedor para que sea `App()` quien las gestione
- [X] T031 [P] [US2] Crear `iosApp/iosApp/Info.plist` con el nombre visible `Madrid Photo Guide` y añadir el icono de marcador de posición en `iosApp/iosApp/Assets.xcassets/`
- [X] T032 [US2] Compilar con `xcodebuild -project iosApp/iosApp.xcodeproj -scheme iosApp -destination 'platform=iOS Simulator,name=iPhone 17' build` y confirmar que enlaza (FR-002)
- [X] T033 [US2] **Validación manual** (validación 3 de quickstart.md): ejecutar en simulador y comprobar los mismos seis puntos que en Android
- [X] T034 [US2] **Validación de paridad** (validación 4 de quickstart.md, FR-004, SC-007): con ambas apps abiertas a la vez, confirmar contenido observable idéntico, misma respuesta al modo oscuro y cero diferencias de capacidad

**Checkpoint**: la app arranca en las dos plataformas con la misma pantalla compartida.

---

## Phase 5: User Story 3 — Verificación automática en cada cambio (Priority: P2)

**Goal**: cada cambio propuesto dispara solo la verificación y publica un resultado visible.

**Independent Test**: abrir un PR con un cambio cualquiera y comprobar que el workflow
arranca sin intervención y publica éxito o fallo.

**Nota de alcance**: el pipeline compila las apps además de pasar los tests. La razón está
en research.md D-005: en KMP+iOS lo que se rompe en silencio es el pegamento de la fase T027,
no los tests.

- [X] T035 [US3] Crear `.github/workflows/ci.yml` con un único job sobre `macos-latest`, disparado por `pull_request` y por `push` a `main`
- [X] T036 [US3] Añadir al workflow el checkout, la configuración de JDK 21 y la selección de Xcode
- [X] T037 [US3] Configurar en el workflow la caché de Gradle y la caché de Kotlin/Native (`~/.konan`), sin las cuales el tiempo de ejecución no cumple SC-005
- [X] T038 [US3] Generar `local.properties` dentro del workflow a partir del `ANDROID_HOME` del runner, para que el build de Android no dependa de un fichero no versionado
- [X] T039 [US3] Añadir los tres pasos de verificación en orden de coste creciente (apartado 5 de contracts/build-interface.md): `./gradlew allTests`, `./gradlew :composeApp:assembleDebug`, y el `xcodebuild` de la app iOS. **No hay paso de formato ni de análisis estático** — se retiró en la constitución v1.1.0 (research.md D-006)
- [X] T040 [US3] Publicar los informes de test como artefacto de la ejecución, para que un fallo se diagnostique desde el log sin reproducir en local (FR-011)
- [ ] T041 [US3] **Validación** (validación 5 de quickstart.md): abrir un PR y confirmar que el workflow arranca solo y publica un check visible (FR-009, FR-010), y medir la duración en régimen estacionario con cachés tibias frente a SC-005 (< 15 min)
- [ ] T042 [US3] **Validación en rojo** (validación 6 de quickstart.md, SC-006): invertir deliberadamente la aserción de `SmokeTest.kt`, confirmar que el check pasa a rojo identificando la prueba y el motivo, revertir y confirmar que vuelve a verde sobre el contenido actualizado (escenario 3.4). Un pipeline que nunca ha estado en rojo no ha demostrado nada

**Checkpoint**: cada cambio queda verificado automáticamente, y se ha comprobado que el
pipeline detecta fallos además de aprobarlos.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T043 [P] Escribir `README.md` con los prerrequisitos, la creación de `local.properties` y los comandos de compilación, prueba y ejecución en ambas plataformas (FR-013)
- [X] T044 Ejecutar la validación 7 de quickstart.md desde un clon limpio en otro directorio: `git clone`, `local.properties`, `./gradlew allTests :composeApp:assembleDebug`, siguiendo únicamente el README (FR-012, SC-003, < 30 min)
- [X] T045 [P] Revisar que `composeApp/src/androidMain` e `iosMain` no contienen más que los hosts de arranque y que no se ha introducido ningún `expect/actual` (principio I de la constitución)
- [X] T046 [P] Confirmar que ninguna versión quedó hardcodeada fuera de `gradle/libs.versions.toml` (restricciones tecnológicas de la constitución)
- [ ] T047 Recorrer las siete validaciones de quickstart.md de principio a fin y dar la feature por entregada

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — empieza de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias
- **User Stories (Phase 3, 4, 5)**: dependen de Foundational; entre sí son independientes
- **Polish (Phase 6)**: depende de las tres historias

### User Story Dependencies

- **US1 (P1, Android)**: arranca tras la fase 2. Sin dependencias de otras historias
- **US2 (P1, iOS)**: arranca tras la fase 2. Comparte con US1 solo la pantalla común; su
  riesgo es propio (el puente Xcode)
- **US3 (P2, CI)**: arranca tras la fase 2 en lo relativo a `allTests`, pero los pasos T039
  de compilación de APK y de app iOS **no pueden pasar en verde** hasta que US1 y US2 estén
  completas. Es la única dependencia real entre historias, y es de verificación, no de
  implementación: el workflow puede escribirse antes y quedará en rojo hasta que las apps
  existan

### Within Each User Story

- Configuración de build antes que código de plataforma
- Código antes que compilación
- Compilación antes que validación manual

### Parallel Opportunities

- T013, T015 y T016 en paralelo dentro de la fase 2 (tema, dependencia de test y clase de test son ficheros distintos)
- **US1 y US2 en paralelo** una vez completada la fase 2: no comparten ningún fichero
- Dentro de US1: T018 y T021 en paralelo (manifest y recursos)
- Dentro de US2: T029 y T031 en paralelo (punto de entrada Swift e `Info.plist`/assets)
- En Polish: T043, T045 y T046 en paralelo

---

## Parallel Example: US1 y US2 tras la fase 2

```bash
# Rama A (Android):
T018 Crear composeApp/src/androidMain/AndroidManifest.xml
T021 Añadir icono y cadenas en composeApp/src/androidMain/res/

# Rama B (iOS), simultáneamente:
T029 Crear iosApp/iosApp/iOSApp.swift
T031 Crear iosApp/iosApp/Info.plist y Assets.xcassets/
```

---

## Implementation Strategy

### MVP mínimo

Fases 1 + 2 + US1 dan una app Android que arranca. Es el primer punto demostrable.

**Pero no es el entregable de esta feature**: el enunciado pide explícitamente ambas
plataformas, y el principio V de la constitución no da una feature por entregada hasta que
está disponible y probada en las dos. US2 no es opcional.

### Entrega incremental sugerida

1. Fases 1 + 2 → base compilable con tests que corren en ambos targets
2. + US1 → app Android arrancando (primer checkpoint demostrable)
3. + US2 → paridad real; **este es el mínimo entregable de la feature**
4. + US3 → la base queda protegida contra regresiones
5. + Polish → reproducible por alguien que llega de cero

### Nota sobre un solo desarrollador

El paralelismo señalado arriba está pensado para ordenar el trabajo, no para repartirlo. En
secuencia, el orden recomendado es US1 → US2 → US3: cerrar Android primero da el bucle de
depuración más rápido, y llegar a iOS con la pantalla compartida ya validada aísla los
fallos del puente Xcode, que es donde se concentra el riesgo.
