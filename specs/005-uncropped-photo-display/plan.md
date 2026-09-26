# Implementation Plan: Visualización completa de fotos (sin recorte)

**Branch**: `005-uncropped-photo-display` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-uncropped-photo-display/spec.md`

## Summary

Las fotos se recortan hoy porque `LocationImage` pinta con el `resizeMode` por defecto de
`<Image>` (`cover`) dentro de cajas de tamaño fijo, tanto en la miniatura de `ListCard` (56×56)
como en la cabecera de `app/location/[id].tsx` (alto fijo 200) como en la vista previa de
`LockedSheet`. La solución tiene dos partes, tal como pide la spec:

1. Un visor a pantalla completa nuevo (`/photo-viewer`, pantalla de `expo-router` en modal
   transparente) alcanzable con un toque desde la cabecera de ficha y desde la miniatura de
   `ListCard` — nunca desde la vista previa de contenido bloqueado — que muestra la imagen
   íntegra usando su proporción real.
2. Un cambio de `resizeMode` a `contain` en los tres contenedores en contexto, con las cajas de
   lista manteniendo su tamaño fijo (relleno neutro cuando la proporción no encaja) y la cabecera
   de ficha pasando a dimensionarse según la proporción real de cada foto.

La proporción real de cada foto se obtiene de forma síncrona con `Image.resolveAssetSource`
sobre los assets ya empaquetados (`require`), sin tocar red ni el esquema de contenido, lo que
además resuelve el soporte a fotos verticales futuras sin más cambios de código (SC-003).

## Technical Context

**Language/Version**: TypeScript 5 (`strict`), sobre Expo SDK 57 / React Native 0.86, React 19.2.

**Primary Dependencies**: `expo-router` (nueva pantalla modal), `react-native` `Image`
(`resizeMode`, `resolveAssetSource`) — todo ya presente en el proyecto; no se añade ninguna
dependencia nueva.

**Storage**: N/A. No hay datos nuevos que persistir; los parámetros de la ruta del visor son
efímeros (viven en la navegación, no en `AsyncStorage`/SQLite).

**Testing**: Jest (`jest-expo` preset) para unitarios de la función pura de encaje;
`@testing-library/react-native` para los tests de aceptación de pantallas, siguiendo el patrón ya
usado en `__tests__/screens/*` (principio III, NO NEGOCIABLE).

**Target Platform**: iOS y Android vía Expo managed workflow (sin soporte web, según
restricciones de la constitución).

**Project Type**: App móvil, base de código única (Expo/React Native + núcleo TypeScript puro).

**Performance Goals**: apertura/cierre del visor percibidos en menos de 1s (SC-002); el cálculo
de proporción es síncrono (sin red, sin `onLoad` asíncrono) por lo que no añade latencia
perceptible ni parpadeo de layout.

**Constraints**: sin backend propio (principio II); el dominio permanece libre de React/RN
(principio I) — el cálculo de encaje de imagen es una utilidad de presentación pura, testeable en
Jest, pero vive en la capa de UI porque no encierra ninguna regla de negocio; la decisión de
acceso a contenido premium no se duplica fuera del módulo único existente (principio VI).

**Scale/Scope**: una pantalla nueva (`app/photo-viewer.tsx`), cambios en tres componentes/pantallas
existentes (`LocationImage`, `ListCard`, `app/location/[id].tsx`) y un ajuste de estilo en
`LockedSheet`; ninguna localización nueva ni cambio de esquema de contenido.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación |
|-----------|------------|
| I. Núcleo compartido en TypeScript puro | **Pass**. No hay regla de negocio nueva; el cálculo de encaje de imagen es geometría de presentación (entrada/salida numérica pura), no una decisión de dominio, y no importa React ni RN, por lo que puede vivir en la capa de UI sin filtrar lógica de negocio a un componente ni sacar del núcleo algo que debiera estar ahí. |
| II. Serverless y cliente-primero | **Pass**. Ningún servicio nuevo; el visor usa exactamente las mismas imágenes ya empaquetadas localmente, funciona sin conectividad igual que hoy. |
| III. Testing por feature (NO NEGOCIABLE) | **Pass, con obligación explícita**: la feature exige test unitario de la función de encaje y tests de aceptación de la ruta nueva y de las pantallas modificadas (detalle en `quickstart.md` y, con más detalle, en `tasks.md`). No se da la feature por completa sin ellos. |
| IV. Firebase como plano de observabilidad | **Pass, sin cambios**. No se introduce ningún evento de analítica nuevo ni obligatorio para esta feature; no hay flag nuevo porque no es una feature de negocio condicional, es una corrección de presentación aplicable a todo el catálogo. |
| V. Paridad funcional con UX nativa | **Pass**. `expo-router` y `Image` son la misma API en ambas plataformas; el comportamiento (qué se ve, qué abre el visor) es idéntico en Android e iOS, solo pueden diferir gestos/convenciones de cierre si el sistema operativo lo exige. |
| VI. Modelo freemium de compra única | **Pass, con diseño explícito**: la ruta `/photo-viewer` no reimplementa ninguna comprobación de titularidad (ver `research.md` §3); reutiliza la única decisión existente (`viewLocation`) en cada punto de llamada, y la vista previa bloqueada nunca ofrece el atajo, tal como se acordó en la clarificación de la spec (FR-009). |

Sin violaciones que requieran justificar en `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/005-uncropped-photo-display/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── photo-viewer-route.md       # Nueva entrada de navegación (a reflejar en 003/contracts/routes.md)
│   └── image-display-contract.md   # Contrato de comportamiento observable en contexto
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Proyecto único Expo/React Native (Opción 1, sin variante web/backend separada — ver
Constitución, principio I y "Restricciones Tecnológicas y de Plataforma"):

```text
app/
├── _layout.tsx                 # [MODIFICADO] registra la nueva pantalla /photo-viewer como Stack.Screen (transparentModal)
├── photo-viewer.tsx             # [NUEVO] pantalla del visor a pantalla completa
├── location/[id].tsx            # [MODIFICADO] la foto de cabecera abre el visor al tocarla; deja de recortar
└── tip/[id].tsx                 # [MODIFICADO] conecta onImagePress de ListCard solo cuando viewLocation ya dio acceso

src/
├── ui/
│   ├── components/
│   │   ├── LocationImage.tsx     # [MODIFICADO] resizeMode="contain" en vez del cover por defecto
│   │   ├── ListCard.tsx          # [MODIFICADO] prop opcional onImagePress con Pressable anidado en la miniatura
│   │   ├── imageLayout.ts        # [NUEVO] función pura de encaje (computeContainedLayout, ver data-model.md)
│   │   └── FittedPhoto.tsx       # [NUEVO] componente compartido: resolver + leer tamaño + encajar + placeholder (cabecera de ficha y visor)
│   └── sheets/
│       └── LockedSheet.tsx       # [MODIFICADO] resizeMode="contain" + fondo neutro en su caja fija, sin añadir interacción

__tests__/
├── components/
│   └── image-layout.test.ts      # [NUEVO] unitario de la función de encaje
└── screens/
    ├── location-detail.test.tsx  # [MODIFICADO] añade el escenario "tocar la foto abre el visor"
    ├── locked-sheet.test.tsx     # [MODIFICADO] añade el escenario "la miniatura no es tocable"
    ├── photo-viewer.test.tsx     # [NUEVO] aceptación de la ruta nueva
    └── saved.test.tsx / tip-detail.test.tsx  # [MODIFICADOS] escenario de tocar la miniatura de ListCard
```

**Structure Decision**: se mantiene la estructura ya existente del proyecto (núcleo en `src/core`,
UI en `src/ui`, rutas en `app/` vía `expo-router`, tests espejo en `__tests__/`). No se crean
directorios nuevos de alto nivel; esta feature solo añade una pantalla, un componente de utilidad
puro y ajustes localizados en componentes/pantallas ya existentes.

## Complexity Tracking

*Sin violaciones de la constitución que requieran justificación.*
