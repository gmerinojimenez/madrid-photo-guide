# Quickstart: Real Location Photos

**Feature**: 004-real-location-photos

Cómo comprobar que esta feature hace lo que la spec promete. Los detalles de diseño están en
[plan.md](./plan.md), [contracts/](./contracts/) y [data-model.md](./data-model.md); aquí solo
está lo que hay que ejecutar y lo que hay que ver.

---

## Prerrequisitos

Ninguno nuevo. Esta feature no añade dependencias (research.md R-001) ni requiere development
build más allá de la que ya exige el proyecto desde la feature 003 (Firebase, `expo-maps`,
`expo-sqlite`). Si el entorno ya corre la app actual, ya está listo para esta feature.

```bash
npm run ios
```

```bash
npm run android
```

---

## Validación manual — US1: foto real en la ficha de localización

1. Abrir la pestaña Mapa.
2. Tocar cualquier localización gratuita (p. ej. Templo de Debod, Castilla, Torres KIO, Sol,
   Plaza Mayor).
3. **Esperado**: la cabecera de la ficha muestra la fotografía real de la localización, no un
   bloque de color.

## Validación manual — US2: miniatura real en tarjetas de lista

1. Guardar al menos una localización (requiere titularidad; en desarrollo, la titularidad en
   memoria por defecto no está comprada — usar el flujo de compra de prueba o la
   implementación en memoria que ya usan los tests de aceptación existentes para simularla).
2. Abrir la pestaña Guardados.
3. **Esperado**: la tarjeta de cada localización guardada muestra su miniatura real.
4. Abrir un consejo con localizaciones relacionadas (pestaña Consejos → cualquier consejo con
   sección "Localizaciones relacionadas").
5. **Esperado**: cada tarjeta relacionada muestra la miniatura real de su localización.

## Validación manual — US3: miniatura real en el sheet de bloqueo

1. Sin titularidad, abrir la pestaña Mapa.
2. Tocar una localización de pago (p. ej. Templo del Tío Pío, Círculo de Bellas Artes,
   Metrópolis).
3. **Esperado**: el sheet de contenido bloqueado muestra la miniatura real de esa localización.

## Validación manual — recaída a bloque de color (FR-004)

No hay hoy ninguna localización real del catálogo sin imagen empaquetada (D-010 generó las 18
imágenes de marcador precisamente para que esto nunca ocurra en producción), así que este
caso **no es observable manualmente** con datos reales — se valida solo con el test automático
de `LocationImage` descrito abajo.

---

## Validación automática

```bash
npm test -- __tests__/components/location-image.test.tsx
```

**Esperado**: pasa el caso "con un resolver que encuentra la imagen, renderiza la fotografía
real" y el caso "con un resolver que devuelve null, renderiza `ImagePlaceholder`" (FR-004).

```bash
npm test -- __tests__/screens/location-detail.test.tsx __tests__/screens/locked-sheet.test.tsx __tests__/screens/saved.test.tsx __tests__/screens/tip-detail.test.tsx
```

**Esperado**: pasan los casos existentes (sin regresión) más el caso nuevo por pantalla que
comprueba que la localización de ejemplo (Templo de Debod, con `thumb.jpg`/`detail.jpg`
reales) se muestra con su imagen real y no con `ImagePlaceholder`.

```bash
npm run verify
```

**Esperado**: tipos, lint, `validate:catalog` y la suite completa de tests pasan sin cambios de
comportamiento fuera de lo descrito en esta feature — en particular, `validate:catalog` sigue
en verde porque esta feature no toca el catálogo ni el registro de imágenes.
