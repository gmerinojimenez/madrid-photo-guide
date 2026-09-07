# Madrid Photo Guide

Guía fotográfica de Madrid. App Expo / React Native en TypeScript, una única base de código
para Android e iOS (ver [constitución del proyecto](.specify/memory/constitution.md)).

Esta entrega es el esqueleto: la app arranca en ambas plataformas hasta una pantalla vacía
correctamente compuesta (respeta áreas seguras y modo claro/oscuro) y una batería de pruebas
de ejemplo corre en CI. Sin contenido de guía, navegación, telemetría ni compras todavía.

## Prerrequisitos

| Requisito | Notas |
|---|---|
| **Node.js ≥ 22.13** | Exigido por Expo SDK 57. Usa un gestor de versiones (`nvm`, `fnm`); hay un `.nvmrc` con `22` |
| **Xcode 16+** | Con al menos un runtime de simulador iOS instalado — solo para `npm run ios` |
| **CocoaPods** | `sudo gem install cocoapods` o `brew install cocoapods` — solo para `npm run ios` |
| **Android SDK** | Vía Android Studio, con una plataforma reciente — solo para `npm run android` |

No hace falta instalar la CLI de Expo: se usa mediante `npx`.

## Primer arranque

```bash
npm ci
```

## Comandos

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint (eslint-config-expo) + Prettier
npm test            # Jest (jest-expo)
npm start           # Metro / servidor de desarrollo

npm run android     # compila e instala en un emulador/dispositivo Android
npm run ios         # compila e instala en un simulador/dispositivo iOS (requiere CocoaPods)
```

`npm run android` / `npm run ios` regeneran los directorios nativos `android/` e `ios/` con
`expo prebuild`; **no se versionan** (generación nativa continua).

## Estructura

- `App.tsx` — única definición de la pantalla, compartida por ambas plataformas
- `app.json` — configuración de Expo (nombre, slug, `com.gmj.madridphotoguide`)
- `__tests__/App.test.tsx` — prueba de ejemplo
- `.github/workflows/ci.yml` — verificación automática (typecheck + lint + tests) en cada PR y push a `main`

## Verificación automática

Cada pull request y cada push a `main` disparan el workflow de CI (`ubuntu-latest`), que
ejecuta `npm ci`, `npm run typecheck`, `npm run lint` y `npm test`. No compila binarios
nativos: eso se hace en local con los comandos de arriba.

## Validación completa

La guía de validación paso a paso está en
[specs/001-app-skeleton-ci/quickstart.md](specs/001-app-skeleton-ci/quickstart.md).
