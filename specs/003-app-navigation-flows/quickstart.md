# Quickstart: Navegación y pantallas de la app

**Feature**: 003-app-navigation-flows

Cómo levantar esta feature y comprobar que hace lo que la spec promete. Los detalles de
diseño están en [plan.md](./plan.md), [contracts/](./contracts/) y
[data-model.md](./data-model.md); aquí solo está lo que hay que ejecutar y lo que hay que ver.

---

## Prerrequisitos

### 1. Development build (obligatorio)

`expo-maps` y `expo-sqlite` son módulos nativos: **esta feature no arranca en Expo Go**. Hace
falta una development build propia, que es además lo que la constitución ya daba por asumido
para el proyecto.

```bash
npx expo prebuild --clean
```

```bash
npm run ios
```

```bash
npm run android
```

### 2. Clave de API de Google Maps (solo Android)

Sin ella **el mapa sale en blanco en Android**, sin error visible: es el fallo más fácil de
diagnosticar mal de toda la feature.

1. Crear un proyecto en Google Cloud y habilitar **Maps SDK for Android**.
2. Crear una clave de API restringida al nombre de paquete `com.gmj.madridphotoguide` y a la
   huella SHA-1 de la firma de desarrollo.
3. Declararla en la configuración de la app (`app.json`), no editando `android/` a mano.

La clave está restringida por paquete y huella, así que va en configuración versionada; no es
un secreto en el sentido de la constitución. iOS usa Apple Maps y no necesita clave.

### 3. Dependencias

```bash
npx expo install expo-router expo-maps expo-sqlite expo-clipboard expo-constants expo-linking expo-splash-screen expo-system-ui react-native-screens react-native-gesture-handler
```

Siempre con `expo install`, nunca con `npm install`: es lo que respeta las versiones del SDK 57.

---

## Validación automática

La puerta completa, igual que en CI:

```bash
npm run verify
```

Encadena tipos, lint, validación del catálogo y tests. Los cuatro tienen que pasar.

Por partes, cuando algo falla:

```bash
npm run validate:catalog
```

Debe terminar **sin errores y sin advertencias**. Si avisa de una imagen que falta, faltan los
JPG de marcador de las localizaciones nuevas; si avisa de un recurso huérfano, sobra un fichero
que el catálogo no declara. Generarlos:

```bash
python3 scripts/generate-placeholder-photos.py
```

```bash
npm test
```

---

## Validación manual, historia por historia

Con la app corriendo en una development build. Cada bloque se corresponde con una historia de
la spec.

### US1 · Mapa y ficha (P1)

1. Abrir la app y llegar al mapa.
2. **Comprobar**: hay 14 marcadores; 5 se ven como accesibles y 9 como bloqueados.
3. Tocar el marcador del Templo de Debod.
4. **Comprobar**: se abre su ficha con nombre, barrio, mejor momento, parámetros de captura,
   descripción de la toma, descripción del barrio y coordenadas exactas; donde iría la
   distancia dice **"Distancia no disponible"**.
5. Escribir "debod" en el buscador; luego "Argüelles"; luego "arguelles" sin tilde.
6. **Comprobar**: los tres filtran igual.
7. Seleccionar el chip "Atardecer", abrir una ficha y volver atrás.
8. **Comprobar**: el chip sigue seleccionado y el texto buscado sigue escrito.

### US2 · Bloqueo y compra (P1)

1. Sin haber comprado, tocar el marcador del Cerro del Tío Pío.
2. **Comprobar**: se abre el panel de contenido bloqueado con el nombre y el barrio, y **no**
   aparecen coordenadas, parámetros de cámara ni descripción. Las filas con candado nombran lo
   que falta, sin mostrarlo.
3. Elegir "Seguir en modo prueba".
4. **Comprobar**: vuelve al mapa como estaba.
5. Volver a tocarlo y elegir "Desbloquear".
6. **Comprobar**: se abre el paywall, con el precio 9,99 € y el **total real del catálogo**
   (14), no "60".
7. Cerrar el paywall con la "X".
8. **Comprobar**: vuelve donde estaba y la barra de modo prueba sigue ahí.
9. Volver al paywall y pulsar "Comprar".
10. **Comprobar**: vuelve al mapa, aparece la confirmación de guía desbloqueada y la barra de
    modo prueba desaparece.
11. Tocar de nuevo el Cerro del Tío Pío.
12. **Comprobar**: ahora abre la ficha completa, con coordenadas.

### US3 · Presentación inicial (P2)

Requiere instalación limpia, o borrar los datos de la app.

1. Abrir por primera vez.
2. **Comprobar**: arranca en el paso 1 de la presentación, sin pestañas visibles.
3. Avanzar hasta el paso 2 y elegir "Activar ubicación".
4. **Comprobar**: avanza al paso 3 y **el sistema no pide ningún permiso**.
5. Elegir "Empezar gratis" y llegar al mapa.
6. Cerrar la app del todo y volver a abrirla.
7. **Comprobar**: arranca directamente en el mapa.
8. Repetir desde instalación limpia eligiendo "Ver la guía completa" en el paso 3.
9. **Comprobar**: lleva al paywall, y al cerrarlo **no** vuelve a la presentación.

### US4 · Consejos (P2)

1. Abrir la pestaña de consejos, con y sin la compra.
2. **Comprobar**: se ven completos en ambos casos; no hay candados.
3. Filtrar por una categoría y volver a "Todo".
4. Abrir un consejo y tocar una localización relacionada.
5. **Comprobar**: abre la ficha si es accesible, o el panel de bloqueo si no.
6. Volver atrás desde esa ficha.
7. **Comprobar**: vuelve **al consejo**, no al mapa.

### US5 · Guardados (P2)

1. Sin la compra, abrir Guardados.
2. **Comprobar**: estado vacío que explica que guardar es de la guía completa, con acceso al
   paywall.
3. Comprar, abrir una ficha y tocar el control de guardar; repetir con otra.
4. **Comprobar**: ambas aparecen en Guardados, la más reciente primero.
5. Cerrar la app del todo y reabrir.
6. **Comprobar**: los guardados siguen ahí. (La titularidad **no**: vuelve a modo prueba, que
   es el comportamiento esperado de la maqueta — D-006.)
7. Con la compra activa otra vez, abrir el panel de filtros y activar "solo guardados".
8. **Comprobar**: el mapa deja solo esos marcadores.
9. **Comprobar** también que en ese panel la distancia se ve pero no se puede tocar.

### US6 · Navegar hasta el punto (P3)

1. Abrir una ficha accesible y pulsar "Navegar hasta la foto".
2. **Comprobar**: se ofrecen Google Maps, Apple Maps y copiar coordenadas, con las coordenadas
   a la vista.
3. Elegir una app de mapas.
4. **Comprobar**: el sistema la abre en el punto correcto. Si no está instalada, abre el
   navegador — es el comportamiento previsto.
5. Volver y elegir copiar coordenadas; pegar en cualquier campo de texto.
6. **Comprobar**: lo pegado coincide **exactamente** con lo que la ficha muestra, con punto
   decimal.

### US7 · Perfil (P3)

1. Abrir Perfil sin la compra.
2. **Comprobar**: la línea de plan dice modo prueba con "5 de 14", y se ofrece desbloquear.
3. Comprar y volver a Perfil.
4. **Comprobar**: la línea pasa a guía completa con 14, y ya no se ofrece desbloquear.
5. Tocar las cinco filas de ajustes.
6. **Comprobar**: ninguna hace nada. Es lo esperado en esta entrega.

---

## Comprobación de recuentos derivados (SC-004)

La que demuestra que los números no están escritos a mano:

1. Añadir una localización al catálogo editando **solo** `src/content/catalog.json` (y sus dos
   JPG de marcador).
2. Ejecutar `npm run validate:catalog` y reiniciar la app.
3. **Comprobar**: la barra de modo prueba, la línea de plan del perfil y el paywall pasan a
   decir 15 sin haber tocado una línea de código.

---

## Fallos frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| Mapa en blanco en Android, sin error | Falta la clave de API de Google Maps |
| La app no arranca tras instalar las dependencias | Sigue en Expo Go; hace falta development build |
| `validate:catalog` se queja de imágenes que faltan | Faltan los JPG de marcador de las 9 localizaciones nuevas |
| Los tests fallan al importar `expo-maps` o `expo-sqlite` | Falta el doble del módulo nativo en `jest.setup` (D-013) |
| Un test no encuentra una ruta | El fichero de test está dentro de `app/`, que Expo Router reserva para rutas |
| La compra se pierde al reiniciar | Comportamiento correcto en esta entrega (D-006), no un defecto |
