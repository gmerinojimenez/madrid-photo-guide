# Quickstart: Geolocalización de la persona usuaria

**Feature**: 004-user-geolocation

Cómo levantar esta feature y comprobar que hace lo que la spec promete. El diseño está en
[plan.md](./plan.md), [contracts/](./contracts/) y [data-model.md](./data-model.md); aquí
solo está lo que hay que ejecutar y lo que hay que ver.

---

## Prerrequisitos

Los de la feature 003 (development build, clave de Google Maps en Android), más:

```bash
npx expo install expo-location
```

Y el plugin de `expo-location` en `app.json` tal como fija
[research.md D-012](./research.md#d-012--configuración-nativa-solo-mientras-se-usa). Como
cambia la configuración nativa, hay que regenerar la build:

```bash
npx expo prebuild --clean && npm run ios      # o npm run android
```

**Comprobar la configuración generada** (sin editarla):

- `ios/<App>/Info.plist` contiene `NSLocationWhenInUseUsageDescription` con el texto en
  español y **no** contiene `NSLocationAlwaysAndWhenInUseUsageDescription` ni
  `NSLocationAlwaysUsageDescription`, ni `location` en `UIBackgroundModes`.
- `android/app/src/main/AndroidManifest.xml` declara `ACCESS_COARSE_LOCATION` y
  `ACCESS_FINE_LOCATION`, y **no** `ACCESS_BACKGROUND_LOCATION` ni
  `FOREGROUND_SERVICE_LOCATION` (FR-001).

---

## Validación automática

```bash
npm run verify
```

Debe pasar entero: tipos, lint, validación del catálogo y todos los tests. En particular:

| Qué | Dónde | Cubre |
|---|---|---|
| Distancia, formato, umbrales, radio | `__tests__/core/location/` | FR-011–FR-015, FR-017–FR-019, SC-002 |
| Rastreador: estados, caché, antigüedad, revocación, eventos | `__tests__/core/location/tracker.test.ts` | FR-001–FR-008, FR-013, FR-023–FR-028 |
| Distancia visible y contenido bloqueado | `__tests__/content/access.test.ts` | FR-020–FR-022, SC-005 |
| Pureza del núcleo | `__tests__/core/purity.test.ts` | principio I |
| Una aceptación por historia | `__tests__/screens/location-*.test.tsx` | US1–US5, SC-004, SC-008 |
| Toda la suite anterior sin cambios | `__tests__/screens/*.test.tsx` | SC-003 |

---

## Validación manual (dispositivo o simulador, en las dos plataformas)

Lo que no se puede probar en JavaScript: diálogo real, punto azul nativo y Ajustes (principio
III). Hacer cada escenario en **iOS y Android** (SC-009).

**Simular la posición**: en el simulador de iOS, *Features → Location → Custom Location*; en
el emulador de Android, *Extended controls → Location*. Puntos útiles:

| Punto | Coordenadas | Para |
|---|---|---|
| Puerta del Sol | 40.416775, -3.703790 | dentro de Madrid |
| Toledo | 39.862832, -4.027323 | lejos de Madrid (~70 km) |

### 1. Conceder desde la presentación (US1)

1. Instalación limpia. Avanzar hasta "Activar ubicación" y pulsarlo.
2. **Comprobar**: aparece el diálogo del sistema con el texto en español; al conceder, la
   presentación pasa al último paso.
3. Terminar la presentación y abrir una localización gratuita.
4. **Comprobar**: la ficha muestra una distancia ("450 m" o "1,2 km"), no "Distancia no
   disponible". Mover la posición simulada unos cientos de metros: la cifra cambia sin salir
   de la ficha.

### 2. "Ahora no" y petición contextual (US1 §2, §6; US3 §5)

1. Instalación limpia; en la presentación pulsar "Ahora no". **Comprobar**: sin diálogo.
2. En el mapa, tocar "Centrar en mi posición". **Comprobar**: ahora sí aparece el diálogo;
   al conceder, el mapa se centra en la posición.

### 3. Ubicación aproximada (US1 §4)

1. Conceder eligiendo "aproximada" (iOS: desactivar "Ubicación exacta" en el diálogo;
   Android 12+: elegir "Aproximada").
2. **Comprobar**: las distancias llevan "aproximada"; el punto del mapa se ve con un círculo
   amplio; la fila del perfil dice "Aproximada" y al tocarla abre Ajustes.

### 4. Denegar y recuperar (US2)

1. Denegar el permiso. Recorrer mapa, búsqueda, ficha, guardados, consejos y perfil.
2. **Comprobar**: todo funciona; ningún diálogo aparece solo, tampoco al cerrar y abrir la
   app.
3. Tocar un chip de distancia. **Comprobar**: en iOS (ya `blocked`) sale el panel con "Abrir
   Ajustes"; en Android, tras la primera denegación, sale el panel con "Permitir ubicación".
4. "Abrir Ajustes", conceder la ubicación y volver. **Comprobar**: sin reiniciar, aparecen
   el punto azul y las distancias, y el perfil dice "Concedida".
5. Revocar en Ajustes y volver. **Comprobar**: desaparecen distancias y punto; el radio
   vuelve a "Todo Madrid".

### 5. Filtro de distancia y lejos de Madrid (US3, casos límite)

1. Con la posición en la Puerta del Sol, elegir "< 1 km". **Comprobar**: solo quedan los
   marcadores cercanos; se compone con la búsqueda y la etiqueta.
2. Mover la posición a Toledo. **Comprobar**: aviso "Estás lejos de Madrid", el filtro deja
   de aplicarse y el mapa no se queda vacío; las fichas siguen mostrando distancias.
3. Volver a la Puerta del Sol. **Comprobar**: "< 1 km" vuelve a aplicarse solo.

### 6. Contenido bloqueado (US4)

1. Sin la compra, con la posición en Madrid, tocar un marcador de pago.
2. **Comprobar**: el panel muestra "< 1 km" o "~N,5 km", nunca metros ni una decimal
   distinta de ,0 o ,5. Mover la posición 100 m: el valor no cambia salvo al cruzar un
   escalón.
3. Comprar (botón simulado) y abrir la misma localización. **Comprobar**: la ficha muestra
   la distancia exacta.

### 7. Última posición conocida (FR-023–FR-025)

1. Con permiso y posición, cerrar la app del todo. Desactivar la simulación de posición (o
   ir a un sitio sin señal) y volver a abrirla.
2. **Comprobar**: las distancias aparecen al instante; si han pasado más de 10 min, llevan
   "posición antigua".
3. Revocar el permiso y volver a concederlo sin posición disponible. **Comprobar**: no
   reaparece la posición antigua: la caché se borró al revocar.

### 8. Privacidad (FR-027, FR-028, SC-006)

Con la app conectada a Metro, conceder y denegar el permiso desde cada origen. **Comprobar**
en la consola: una línea `location_permission_result` por petición, con `state` y `origin`,
y ninguna coordenada ni distancia en ningún log de analítica.
