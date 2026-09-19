# Madrid Photo Guide

Guía fotográfica de Madrid. App Expo / React Native en TypeScript, una única base de código
para Android e iOS (ver [constitución del proyecto](.specify/memory/constitution.md)).

Esta entrega es el esqueleto: la app arranca en ambas plataformas hasta una pantalla vacía
correctamente compuesta (respeta áreas seguras y modo claro/oscuro) y una batería de pruebas
de ejemplo corre en CI. Sin navegación, telemetría ni compras todavía.

El contenido de la guía —localizaciones fotográficas, barrios, etiquetas y consejos— vive en
`src/content/catalog.json` y se carga y valida con el núcleo de `src/core/content/`. Sin
pantallas todavía: ver [specs/002-content-data-schema](specs/002-content-data-schema/).

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
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint (eslint-config-expo) + Prettier
npm run validate:catalog  # valida src/content/catalog.json (ver más abajo)
npm test               # Jest (jest-expo)
npm run verify         # typecheck + lint + validate:catalog + test, lo que corre en CI
npm start              # Metro / servidor de desarrollo

npm run android     # compila e instala en un emulador/dispositivo Android
npm run ios         # compila e instala en un simulador/dispositivo iOS (requiere CocoaPods)
```

`npm run android` / `npm run ios` regeneran los directorios nativos `android/` e `ios/` con
`expo prebuild`; **no se versionan** (generación nativa continua).

## Estructura

- `App.tsx` — única definición de la pantalla, compartida por ambas plataformas
- `app.json` — configuración de Expo (nombre, slug, `com.gmj.madridphotoguide`)
- `src/core/content/` — dominio del catálogo: esquema, carga, acceso, búsqueda. TypeScript
  puro, sin React ni React Native (verificado por ESLint)
- `src/content/catalog.json` — el contenido de la guía (ver más abajo)
- `src/platform/images/registry.ts` — `require` estáticos de las fotos empaquetadas
- `scripts/validate-catalog.ts` — validador publicable del catálogo, usado en CI
- `__tests__/` — suite de tests (`App.test.tsx` de la feature 001, `content/` de esta feature)
- `.github/workflows/ci.yml` — verificación automática (`npm run verify`) en cada PR y push a `main`

## Añadir contenido al catálogo

1. **Una localización nueva**: añade una entrada al array `locations` de
   `src/content/catalog.json`, copiando la forma de una existente (ver
   [contracts/catalog-schema.md](specs/002-content-data-schema/contracts/catalog-schema.md)).
   Dejas los JPG en `assets/content/photos/<id>/{thumb,detail}.jpg` — la ruta se deduce del
   identificador, nunca se escribe en el catálogo (ver
   [contracts/image-store.md](specs/002-content-data-schema/contracts/image-store.md)) — y
   añades las dos líneas correspondientes a `src/platform/images/registry.ts`, la única lista
   de rutas literales del proyecto.
2. **Un consejo nuevo**: añade una entrada al array `tips`, con una `categoryId` del
   vocabulario de `tipCategories` (o cualquier otra: se agrupa bajo una categoría de respaldo).
3. Corre `npm run validate:catalog && npm test` para comprobar que todo referencia
   correctamente y que ningún fichero de `src/core/` ha hecho falta tocar.

Ver la API pública que consumirán las pantallas en
[contracts/core-api.md](specs/002-content-data-schema/contracts/core-api.md).

## Verificación automática

Cada pull request y cada push a `main` disparan el workflow de CI (`ubuntu-latest`), que
ejecuta `npm ci` y `npm run verify` (typecheck, lint, validación del catálogo y tests). No
compila binarios nativos: eso se hace en local con los comandos de arriba.

## Validación completa

Las guías de validación paso a paso están en
[specs/001-app-skeleton-ci/quickstart.md](specs/001-app-skeleton-ci/quickstart.md) y
[specs/002-content-data-schema/quickstart.md](specs/002-content-data-schema/quickstart.md).
