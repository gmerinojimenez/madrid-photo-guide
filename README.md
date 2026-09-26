# Madrid Photo Guide

Guía fotográfica de Madrid. App Expo / React Native en TypeScript, una única base de código
para Android e iOS (ver [constitución del proyecto](.specify/memory/constitution.md)).

La app navegable completa: mapa real, ficha de localización, consejos, guardados, perfil,
presentación inicial y el flujo modo prueba → contenido bloqueado → paywall → comprado (ver
[specs/003-app-navigation-flows](specs/003-app-navigation-flows/)).

La geolocalización es real: permiso en primer plano, distancia en la ficha, punto de
posición y filtro por radio en el mapa, y distancia redondeada para el contenido bloqueado
(ver [specs/004-user-geolocation](specs/004-user-geolocation/)).

El contenido de la guía —localizaciones fotográficas, barrios, etiquetas y consejos— vive en
`src/content/catalog.json` y se carga y valida con el núcleo de `src/core/content/` (ver
[specs/002-content-data-schema](specs/002-content-data-schema/)).

## Prerrequisitos

| Requisito | Notas |
|---|---|
| **Node.js ≥ 22.13** | Exigido por Expo SDK 57. Usa un gestor de versiones (`nvm`, `fnm`); hay un `.nvmrc` con `22` |
| **Xcode 16+** | Con al menos un runtime de simulador iOS instalado — solo para `npm run ios` |
| **CocoaPods** | `sudo gem install cocoapods` o `brew install cocoapods` — solo para `npm run ios` |
| **Android SDK** | Vía Android Studio, con una plataforma reciente — solo para `npm run android` |
| **Clave de API de Google Maps (Android)** | Ver [Mapa en Android](#mapa-en-android) — sin ella el mapa sale en blanco en Android |

No hace falta instalar la CLI de Expo: se usa mediante `npx`.

> **Development build obligatorio**: `expo-maps` no funciona en Expo Go. `npm run android` /
> `npm run ios` generan y ejecutan una development build; no hay forma de previsualizar el
> mapa con la app de Expo Go de las tiendas.

## Primer arranque

```bash
npm ci
```

## Mapa en Android

El mapa usa `expo-maps`, que en Android necesita una clave de API de Google Maps SDK for
Android declarada en la configuración de la app:

1. Crea (o reutiliza) un proyecto en [Google Cloud Console](https://console.cloud.google.com/),
   habilita **Maps SDK for Android** y genera una clave de API.
2. Restringe la clave por nombre de paquete (`com.gmj.madridphotoguide`) y huella SHA-1 de tu
   keystore de firma. Restringida así, no es un secreto en el sentido de la constitución del
   proyecto y puede vivir en configuración versionada.
3. Sustituye `REPLACE_WITH_GOOGLE_MAPS_ANDROID_API_KEY` en `app.json`
   (`expo.android.config.googleMaps.apiKey`) por la clave real.

Sin ella, `npm run android` compila igual pero el mapa se muestra en blanco, con los
marcadores encima (degradación sin conectividad, D-003).

## Compra única y RevenueCat

El desbloqueo del contenido premium usa [RevenueCat](https://www.revenuecat.com/) sobre
`react-native-purchases` (ver [specs/004-revenuecat-payments](specs/004-revenuecat-payments/)).
Es un módulo nativo autoenlazado —no un config plugin—, así que también exige **development
build**: no funciona en Expo Go.

Para comprar o restaurar de verdad hace falta configurar tres consolas (RevenueCat, Google
Play Console y App Store Connect) y sustituir los marcadores de `app.json`
(`expo.extra.revenuecat.iosApiKey` / `androidApiKey`) por las claves **públicas** de cada
plataforma. Sin claves reales, la app arranca igual, el contenido gratuito funciona, y el
paywall explica que la compra no está disponible (degradación de D-009).

Los pasos de consola, la lista de comprobación de manifiesto (D-002) y la validación contra
las tiendas reales están en
[specs/004-revenuecat-payments/quickstart.md](specs/004-revenuecat-payments/quickstart.md#4-configuración-de-consolas-una-vez).

## Ubicación

El permiso de ubicación (`expo-location`, solo en primer plano) es configuración nativa: un
cambio en `app.json` desde la última vez que compilaste exige regenerar la development build
(`npx expo prebuild --clean && npm run android` / `npm run ios`), igual que con el mapa.

Para probar la geolocalización sin moverte, simula la posición desde el propio
simulador/emulador:

- **iOS (simulador)**: menú *Features → Location → Custom Location…*
- **Android (emulador)**: *Extended controls (⋯) → Location*

Un punto de referencia útil es la Puerta del Sol (40.416775, -3.703790); un punto a más de
50 km de ahí (p. ej. Toledo, 39.862832, -4.027323) sirve para probar el aviso de "lejos de
Madrid". El recorrido de validación manual completo está en
[specs/004-user-geolocation/quickstart.md](specs/004-user-geolocation/quickstart.md).

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

- `app/` — árbol de rutas de **Expo Router** (punto de entrada: `expo-router/entry`). Solo
  rutas y layouts, sin lógica de dominio y sin tests
- `app.json` — configuración de Expo (nombre, slug, `com.gmj.madridphotoguide`, tema oscuro,
  clave de Google Maps para Android)
- `src/core/` — dominio en TypeScript puro, sin React ni nativo (verificado por ESLint):
  contenido del catálogo, titularidad, ubicación (`src/core/location/`: permiso, distancia,
  filtro por radio), analítica (`src/core/analytics/`, catálogo tipado de eventos), enlaces
  de navegación y puertos de almacenamiento
- `src/platform/` — adaptadores nativos tras los puertos del núcleo: SQLite, imágenes,
  `Linking`, `expo-clipboard` y `expo-location`
- `src/ui/` — componentes React compartidos por las rutas: tema, proveedores, el único
  componente de mapa (`src/ui/map/LocationMap.tsx`), los paneles superpuestos y componentes
  compartidos
- `src/content/catalog.json` — el contenido de la guía (ver más abajo)
- `scripts/validate-catalog.ts` — validador publicable del catálogo, usado en CI
- `__tests__/` — suite de tests: `core/` (unitarios del núcleo), `content/` (feature 002),
  `screens/` (aceptación con `renderRouter` de `expo-router/testing-library`)
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
[specs/001-app-skeleton-ci/quickstart.md](specs/001-app-skeleton-ci/quickstart.md),
[specs/002-content-data-schema/quickstart.md](specs/002-content-data-schema/quickstart.md) y
[specs/003-app-navigation-flows/quickstart.md](specs/003-app-navigation-flows/quickstart.md).
Esta última exige recorrerse en Android **y** en iOS, en una development build (`npm run
android` / `npm run ios`): es la que ejercita el mapa real, las siete historias de usuario y
la paridad funcional entre plataformas que exige el principio V de la constitución.
