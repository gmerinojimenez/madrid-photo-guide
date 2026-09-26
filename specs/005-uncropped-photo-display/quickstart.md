# Quickstart: validar la visualización completa de fotos

**Feature**: 005-uncropped-photo-display

Guía de validación manual y de arranque de la suite automática. No sustituye a los tests de
aceptación exigidos por el principio III de la constitución (esos se listan en `tasks.md`); esto
es lo que se corre a mano para confirmar que la feature funciona de punta a punta.

## Prerrequisitos

- Node y dependencias instaladas: `npm install` (ya debería estar hecho en este repo).
- Una dev build de Expo instalada en simulador/dispositivo, o `npx expo start` con un simulador ya
  configurado (la app no corre en Expo Go por los SDKs nativos de Firebase — ver constitución).

## Arrancar la app

```bash
npx expo start
```

Abrir en iOS o Android indistintamente (paridad de plataformas, principio V): el comportamiento
debe ser idéntico en ambas.

## Escenarios a comprobar

### 1. Foto completa en la ficha de un lugar gratuito

1. Abrir el mapa, tocar un lugar gratuito (p. ej. "CaixaForum", "Puerta del Sol").
2. En la ficha, comprobar que la foto de cabecera se ve entera: ningún borde recortado, y no hay
   deformación (la foto no se ve "estirada").
3. Tocar la foto de cabecera → debe abrirse la vista a pantalla completa con la misma imagen,
   entera. Cerrarla (toque / control de cierre) → debe volver exactamente a la ficha, en la misma
   posición de scroll.

### 2. Foto completa en tarjetas de listado

1. Ir a "Guardados" con al menos un lugar guardado (requiere haber "comprado" en modo de pruebas,
   o usar el estado de entitlement de desarrollo).
2. Comprobar que la miniatura de cada tarjeta muestra la foto completa dentro de su caja (56×56),
   sin recorte, con relleno de fondo si la proporción no llena la caja exactamente.
3. Tocar la miniatura (no el resto de la fila) → debe abrir la vista a pantalla completa de esa
   foto. Tocar el resto de la fila (título) → debe navegar a la ficha del lugar, no al visor.

### 3. Vista previa de contenido bloqueado no es tocable

1. Desde el mapa o desde un consejo, abrir una localización de pago sin haber comprado.
2. Comprobar que el panel de "contenido bloqueado" muestra su miniatura completa, sin recorte.
3. Tocar la miniatura de ese panel → no debe pasar nada (no se abre ningún visor a pantalla
   completa).

### 4. Foto vertical (caso futuro)

1. Añadir temporalmente una imagen de prueba con orientación vertical en el lugar de un `require`
   existente en `src/platform/images/registry.ts` (o usar un fixture de test dedicado).
2. Repetir los pasos 1 y 2 con esa foto: debe verse completa y sin deformar tanto en la tarjeta
   como en la cabecera de ficha como en el visor a pantalla completa, sin haber tocado el código
   de layout de esas pantallas.

### 5. Rotación durante el visor a pantalla completa

1. Abrir cualquier foto a pantalla completa.
2. Girar el dispositivo/simulador.
3. La foto debe seguir viéndose completa y sin recortar en la nueva orientación.

## Suite automática

```bash
npm test
```

Debe incluir (añadidos por esta feature, ver `tasks.md`):

- Test unitario de la función pura de encaje (`ContainedLayout`, ver `data-model.md`): casos
  horizontal, vertical y proporción extrema.
- Test de aceptación de `/photo-viewer`: abre, muestra la imagen completa, cierra y vuelve.
- Test de aceptación actualizado de `app/location/[id].tsx`: tocar la cabecera abre el visor.
- Test de aceptación actualizado de `ListCard` / pantalla que la usa: tocar la miniatura abre el
  visor; tocar el resto de la fila sigue navegando a la ficha.
- Test de aceptación actualizado de `locked-sheet.test.tsx`: la miniatura no es tocable (no
  navega a ningún visor).
