# Phase 1 — Quickstart: validar el esqueleto

**Feature**: `001-app-skeleton-ci` | **Date**: 2026-09-01

Guía de validación: qué ejecutar y qué debe ocurrir para dar la feature por entregada. Los
detalles de diseño están en [plan.md](./plan.md) y [research.md](./research.md); los nombres
y comandos estables, en [contracts/build-interface.md](./contracts/build-interface.md).

## Prerrequisitos

| Requisito | Comprobación | Estado en la máquina actual |
|---|---|---|
| JDK 21 | `java -version` | ✅ Zulu 21.0.2 |
| Xcode 16+ con runtime de simulador iOS | `xcodebuild -version` | ✅ Xcode 26.6, runtimes iOS 26.4/26.5 |
| Android SDK con API 36 | `ls $ANDROID_HOME/platforms` | ✅ presente en `~/Library/Android/sdk` |
| `local.properties` con `sdk.dir` | ver más abajo | ⚠️ **pendiente** — `ANDROID_HOME` no está exportada |

`local.properties` no se versiona. Créalo en la raíz antes del primer build:

```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties
```

No hace falta instalar Gradle ni Kotlin: el wrapper los descarga.

## Validación 1 — La batería de pruebas se ejecuta (FR-007, FR-008)

```bash
./gradlew allTests
```

**Resultado esperado**: `BUILD SUCCESSFUL`, con la prueba de ejemplo ejecutada **en los dos
targets** (Android unit test e `iosSimulatorArm64`). Que aparezca en ambos es el punto:
confirma que `commonTest` cubre de verdad las dos plataformas y no solo la JVM.

La primera ejecución descarga el toolchain de Kotlin/Native y tarda varios minutos; las
siguientes son rápidas.

## Validación 2 — La app arranca en Android (Historia 1)

```bash
./gradlew :composeApp:installDebug
```

Con un emulador o dispositivo conectado. Después, abre **Madrid Photo Guide** desde el
lanzador y comprueba:

1. Muestra una pantalla vacía y permanece abierta, sin cierres ni diálogos de error.
2. Enviada a segundo plano y recuperada, sigue en la misma pantalla sin reiniciarse.
3. Con el modo avión activado, arranca igualmente.
4. Al rotar el dispositivo, la pantalla sigue correctamente pintada.
5. Al cambiar el sistema de claro a oscuro, el fondo acompaña el cambio.
6. El contenido no queda bajo el notch ni bajo la barra de gestos.

Repite el arranque 10 veces sobre instalación limpia para dar por cumplido SC-001, y
cronometra el arranque para SC-002 (< 2 s hasta pantalla visible).

## Validación 3 — La app arranca en iOS (Historia 2)

```bash
open iosApp/iosApp.xcodeproj
```

Selecciona el esquema `iosApp` y un simulador, y ejecuta (⌘R). Alternativa sin abrir la UI
de Xcode:

```bash
xcodebuild -project iosApp/iosApp.xcodeproj -scheme iosApp -destination 'platform=iOS Simulator,name=iPhone 17' build
```

**Comprobaciones**: las mismas seis de la validación 2, sobre el simulador o un dispositivo.

**Si falla el enlazado** (`No such module 'ComposeApp'` o el framework no aparece): revisa la
Run Script build phase y los cuatro nombres del apartado 2 de
[contracts/build-interface.md](./contracts/build-interface.md). Es la causa habitual.

## Validación 4 — Paridad entre plataformas (FR-004, SC-007)

Con la app abierta simultáneamente en Android y en iOS, compara ambas pantallas iniciales:
mismo contenido observable (vacío), misma respuesta al modo oscuro, ninguna capacidad
presente en una y ausente en la otra.

## Validación 5 — La verificación automática funciona (Historia 3)

1. Abre un pull request con un cambio cualquiera.
2. **Esperado**: el workflow arranca solo, sin intervención, y publica un check en el PR
   (FR-009, FR-010).
3. Con todo correcto, el check queda en verde y la ejecución completa dura menos de 15
   minutos en régimen estacionario, con cachés tibias (SC-005). La primera ejecución será
   más lenta y es esperada.

## Validación 6 — Un fallo se detecta y se explica (SC-006, FR-011)

La comprobación que de verdad valida el pipeline: uno que nunca ha estado en rojo no ha
demostrado nada.

1. Rompe deliberadamente la prueba de ejemplo (invierte su aserción).
2. Súbelo al PR.
3. **Esperado**: el check pasa a rojo, y el log identifica la prueba concreta y el motivo
   sin necesidad de reproducir el fallo en local.
4. Revierte el cambio y confirma que el check vuelve a verde sobre el contenido actualizado
   (escenario 3.4).

## Validación 7 — Reproducible desde cero (FR-012, FR-013, SC-003)

En un directorio limpio:

```bash
git clone git@github.com:gmerinojimenez/madrid-photo-guide.git
cd madrid-photo-guide
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties
./gradlew allTests :composeApp:assembleDebug
```

**Esperado**: funciona siguiendo solo el README, sin conocimiento tácito ni pasos manuales
no documentados, en menos de 30 minutos incluyendo descargas.

## Criterio de entrega

La feature está completa cuando las siete validaciones pasan. Las validaciones 2, 3 y 4 son
manuales en esta entrega —no hay comportamiento de usuario automatizable todavía— según lo
registrado en el Complexity Tracking de [plan.md](./plan.md).
