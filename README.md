# Madrid Photo Guide

Guía fotográfica de Madrid. Kotlin Multiplatform (Compose Multiplatform) para Android e
iOS. Esta entrega es el esqueleto: la app arranca en ambas plataformas hasta una pantalla
vacía, y una batería de pruebas de ejemplo corre en CI. Sin contenido de guía todavía.

## Prerrequisitos

- **JDK 21**
- **Xcode 16+** con un runtime de simulador iOS instalado
- **Android SDK** con la plataforma 37 (`compileSdk`) instalada — usa Android Studio o
  `sdkmanager "platforms;android-37.2"`

No hace falta instalar Gradle ni Kotlin: el proyecto usa el wrapper (`./gradlew`).

## Primer arranque

Crea `local.properties` en la raíz (no se versiona):

```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties
```

## Comandos

```bash
# Batería de pruebas compartida (Android + iOS simulador)
./gradlew allTests

# APK de depuración
./gradlew :composeApp:assembleDebug

# Instalar en un dispositivo/emulador Android conectado
./gradlew :composeApp:installDebug
```

Para iOS, abre `iosApp/iosApp.xcodeproj` en Xcode, selecciona el esquema `iosApp` y un
simulador, y ejecuta (⌘R). O desde línea de comandos:

```bash
xcodebuild -project iosApp/iosApp.xcodeproj -scheme iosApp \
  -destination 'platform=iOS Simulator,name=iPhone 17' build
```

## Estructura

- `composeApp/` — módulo compartido Kotlin Multiplatform (`commonMain`, `androidMain`,
  `iosMain`, `commonTest`)
- `iosApp/` — proyecto Xcode que enlaza el framework producido por `composeApp`
- `.github/workflows/ci.yml` — verificación automática en cada cambio

Más contexto de diseño en [specs/001-app-skeleton-ci/](specs/001-app-skeleton-ci/).

## Validación completa

La guía de validación paso a paso está en
[specs/001-app-skeleton-ci/quickstart.md](specs/001-app-skeleton-ci/quickstart.md).
