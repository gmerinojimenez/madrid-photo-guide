# Checklist de publicación — Madrid Photo Guide

Cuenta de desarrollador nueva ("gmj"), persona física, ambas tiendas, mercado mundial.
Sigue el orden: hay pasos bloqueados por otras tareas en curso (i18n, GPS,
integración RevenueCat).

## 0. Hecho en este repo

- [x] `eas.json` con perfiles `development` / `preview` / `production`
- [x] `docs/privacy.html` — política de privacidad
- [x] `docs/store-listing-es.md` — textos del listing en español
- [x] `app.json` con `bundleIdentifier` / `package` definitivos

## 1. Cuentas (las haces tú — pagos e identidad)

- [ ] **Apple Developer Program** (developer.apple.com) — persona física, 99$/año.
      La verificación de identidad puede tardar 24–48h.
- [ ] **Google Play Console** (play.google.com/console) — persona física, 25$ pago único.
      Google puede pedir verificación de identidad adicional (días).
- [ ] **Cuenta Expo/EAS** (expo.dev) — gratuita.
- [ ] **Cuenta RevenueCat** (revenuecat.com) — la estás gestionando tú en la tarea paralela
      de integración; solo falta enlazarla a los productos de las tiendas (paso 4).

## 2. GitHub Pages para la política de privacidad

- [ ] En GitHub: Settings → Pages → Source: rama `main`, carpeta `/docs`
- [ ] Verificar que `https://gmerinojimenez.github.io/madrid-photo-guide/privacy.html` carga
- [ ] Guardar esa URL — se pide en ambas consolas

## 3. Configuración EAS (cuando tengas cuenta)

```bash
npx eas login
npx eas init          # crea el proyecto y añade extra.eas.projectId a app.json
```

- [ ] Confirmar que `app.json` tiene `extra.eas.projectId` tras `eas init`
- [ ] Google Maps API key real (Android) — sustituir el placeholder en `app.json`:
      `android.config.googleMaps.apiKey` (ver `README.md` sección "Mapa en Android")
- [ ] Restringir esa API key en Google Cloud Console al SDK de Maps Android + al
      `package name` + SHA-1 del certificado de firma de EAS

## 4. Bloqueado por otras tareas en curso

No avanzar estos pasos hasta que aterricen las tareas correspondientes:

- [ ] **i18n de la UI** → entonces: traducir `docs/store-listing-es.md` al inglés,
      añadir listing en inglés en ambas consolas
- [ ] **Función de GPS** → entonces: añadir `NSLocationWhenInUseUsageDescription` en
      `app.json` (iOS) y el permiso `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION`
      (Android, vía plugin `expo-location`); completar el cuestionario de privacidad
      de ubicación en ambas consolas (App Privacy / Data safety)
- [ ] **Integración RevenueCat** → entonces: crear los productos de compra
      (`madrid_photo_guide_unlock`, compra única) en App Store Connect y Play Console,
      copiar sus IDs a RevenueCat, verificar la compra de prueba en sandbox

## 5. Capturas de pantalla

- [ ] Generar desde simulador iOS (6.7" y 5.5") y emulador Android (teléfono + tablet
      si `supportsTablet` sigue activo)
- [ ] Pantallas sugeridas: mapa con marcadores, detalle de localización con parámetros
      de cámara, paywall, pantalla de guardados

## 6. App Store Connect

- [ ] Crear app nueva, bundle ID `com.gmj.madridphotoguide`
- [ ] Rellenar listing (usar `docs/store-listing-es.md`)
- [ ] Subir capturas
- [ ] App Privacy questionnaire (datos de compra vía RevenueCat; ubicación cuando
      llegue esa tarea)
- [ ] Clasificación de edad (4+, sin contenido sensible)
- [ ] Crear producto de compra única (In-App Purchase, non-consumable)
- [ ] Subir build vía `eas build --platform ios --profile production` +
      `eas submit --platform ios`
- [ ] Enviar a revisión (TestFlight primero recomendado)

## 7. Google Play Console

- [ ] Crear app nueva, package `com.gmj.madridphotoguide`
- [ ] Rellenar listing (usar `docs/store-listing-es.md`)
- [ ] Subir capturas
- [ ] Data safety form (mismo criterio que App Privacy)
- [ ] Clasificación de contenido (cuestionario IARC → PEGI 3 esperado)
- [ ] Crear producto de compra única (in-app product, managed)
- [ ] Subir build vía `eas build --platform android --profile production` +
      `eas submit --platform android`
- [ ] Publicar primero en pista interna/cerrada antes de producción

## 8. Después de la primera publicación

- [ ] Verificar la compra real en ambas tiendas con una cuenta de prueba
- [ ] Confirmar que la política de privacidad y el listing de ubicación coinciden
      con el comportamiento real de la app
