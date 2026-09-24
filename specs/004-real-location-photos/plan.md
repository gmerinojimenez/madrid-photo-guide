# Implementation Plan: Real Location Photos

**Branch**: `004-real-location-photos` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-real-location-photos/spec.md`

## Summary

Sustituir el uso incondicional de `<ImagePlaceholder>` por la fotografía real en las tres
pantallas que ya tienen datos e imágenes enlazados pero nunca los pintan: la ficha de
localización (`app/location/[id].tsx`), las tarjetas de lista (`ListCard`, usada en Guardados
y en Consejo → Localizaciones relacionadas) y el sheet de contenido bloqueado (`LockedSheet`).

El enfoque: un componente nuevo, `LocationImage`, que envuelve la única decisión que hace
falta — pedir a `imageRegistry.resolve()` la imagen para una `ImageRef` dada y, si existe,
renderizarla con el componente `Image` de React Native (las fuentes son siempre `require()`
locales, sin red); si `resolve()` devuelve `null`, renderizar `ImagePlaceholder` sin cambios.
Las tres pantallas ya tienen la `ImageRef` que necesitan a mano (`full.detailImage` en la
ficha, `preview.thumbnail` en el sheet, `location.thumbnail` en los dos sitios que llaman a
`ListCard`), así que no hace falta tocar el núcleo, el catálogo ni el registro de imágenes:
esto es cableado de UI puro, sin nuevo estado de dominio.

No hay decisiones de arquitectura por resolver — `imageRegistry` y `ImageRef` ya existen desde
la feature 003 (D-010) precisamente para esto. El único fleco técnico, resuelto en
[research.md](./research.md), es confirmar que el componente `Image` ya incluido en React
Native basta (sin dependencia nueva) porque todas las fuentes son locales.

## Technical Context

**Language/Version**: TypeScript `~6.0.3` en modo `strict`, sobre Expo SDK 57 / React Native
0.86.3 (sin cambios respecto a las features 001-003).

**Primary Dependencies**: ninguna nueva. Se usa `Image` de `react-native` (ya incluido en el
proyecto) para pintar las fuentes locales que devuelve `imageRegistry.resolve()`.
`imageRegistry`, `ImageRef` y `composeImageKey` ya existen en `src/platform/images/registry.ts`
y `src/core/content/images.ts`.

**Storage**: N/A — las imágenes siguen siendo ficheros empaquetados con `require` en
`assets/content/photos/`, resueltos por el registro existente. No se lee ni escribe ningún
nuevo dato.

**Testing**: Jest con preset `jest-expo`, igual que el resto del proyecto. Aceptación con
React Native Testing Library sobre las pantallas/componentes afectados, verificando el
contenido observable (qué se renderiza) en vez de props internas. Sin tests de núcleo nuevos:
`imageRegistry` y `composeImageKey` ya están cubiertos por `__tests__/content/images.test.ts`
de la feature 002.

**Target Platform**: Android e iOS, sin diferencias de plataforma — `Image` de React Native es
multiplataforma y no introduce ninguna bifurcación.

**Project Type**: aplicación móvil multiplataforma (sin cambio respecto a features previas).

**Performance Goals**: las imágenes se muestran sin bloquear el hilo de JavaScript ni
introducir parpadeo perceptible en listas (`ListCard` puede repetirse varias veces en la misma
pantalla, p. ej. localizaciones relacionadas).

**Constraints**: sin red — todas las imágenes de esta entrega son locales
(`require`/`assets/content/photos/`); no se introduce carga remota ni caché de red. Debe
seguir funcionando sin conectividad, igual que el resto de la app (principio II).

**Scale/Scope**: 3 pantallas/componentes tocados (`app/location/[id].tsx`, `ListCard.tsx`,
`LockedSheet.tsx`), 1 componente nuevo (`LocationImage`), 2 puntos de llamada a `ListCard` que
ganan una prop nueva (`saved.tsx`, `tip/[id].tsx`). 14 localizaciones del catálogo, cada una
con al menos una miniatura empaquetada; 5 con imagen de detalle empaquetada (las gratuitas).

## Constitution Check

*GATE: comprobado antes de Phase 0 y de nuevo tras el diseño de Phase 1.*

| Principio | Cómo lo cumple este plan | Estado |
|-----------|--------------------------|--------|
| **I. Núcleo compartido en TypeScript puro** | No se toca el núcleo. `LocationImage` es un componente de UI que consume `imageRegistry` (ya definido tras una interfaz, `ImageResolver`, en `src/core/content/images.ts`) exactamente como ya lo hacía el registro; ninguna regla de negocio nueva se escribe en la UI. | ✅ |
| **II. Serverless y cliente-primero** | Cero servicios nuevos. Las imágenes siguen siendo ficheros locales empaquetados; nada de esto requiere red ni cambia el comportamiento offline. | ✅ |
| **III. Testing por feature** | Cada pantalla tocada gana (o extiende) un test de aceptación que verifica: imagen real visible cuando `resolve()` la encuentra, y recaída a `ImagePlaceholder` cuando no. Ver quickstart.md para los escenarios exactos. | ✅ |
| **IV. Firebase como plano de observabilidad** | Sin cambios: no se añade telemetría ni flags nuevos. No aplica. | ✅ |
| **V. Paridad funcional con UX nativa** | `Image` de React Native es el mismo componente en Android e iOS, sin bifurcación de plataforma. El comportamiento (qué imagen se ve, cuándo recae en el bloque de color) es idéntico en ambas. | ✅ |
| **VI. Freemium de compra única** | No se toca la decisión de acceso. La ficha de localización solo es alcanzable con una `Location` completa (gratuita o ya comprada) según el enrutado existente (R-3); el sheet de bloqueo solo recibe `LocationPreview.thumbnail`, que nunca incluye `detailImage`. `LocationImage` no decide qué es visible, solo pinta lo que la pantalla ya tenía permiso para leer. | ✅ |
| **Restricciones tecnológicas** | Cero dependencias nuevas — se prefiere la API de plataforma (`Image` de `react-native`) a añadir una librería, en línea con la restricción de dependencias. Sin `any` ni `@ts-ignore`. Sin tocar `ios/`/`android/` ni config plugins. | ✅ |
| **Flujo y puertas de calidad** | Spec → plan → tasks antes de implementar. Las puertas de CI existentes (tipos, lint, `validate:catalog`, tests) no cambian. Commits `feat:` (comportamiento nuevo: las pantallas pintan fotos reales). | ✅ |

**Resultado del gate (pre-Phase 0)**: pasa sin desviaciones. No hace falta Complexity Tracking.

**Resultado del gate (post-Phase 1)**: sin cambios respecto al pre-Phase 0. El diseño de
Phase 1 (data-model.md, contracts/location-image.md) confirma que no hace falta tocar el
núcleo ni añadir dependencias: `LocationImage` es el único artefacto nuevo, es UI pura, y su
prop `resolver` inyectable (R-004a) es la única superficie añadida al puerto `ImageResolver`
ya existente — no un puerto nuevo. Sigue pasando sin desviaciones.

## Project Structure

### Documentation (this feature)

```text
specs/004-real-location-photos/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── location-image.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── core/
│   └── content/
│       └── images.ts              # Ya existe (ImageResolver, composeImageKey) — sin cambios
├── platform/
│   └── images/
│       └── registry.ts            # Ya existe (imageRegistry) — sin cambios
└── ui/
    ├── components/
    │   ├── ImagePlaceholder.tsx   # Ya existe — sin cambios, pasa a ser solo la recaída
    │   ├── LocationImage.tsx      # NUEVO — resuelve una ImageRef y pinta foto real o recae
    │   └── ListCard.tsx           # MODIFICADO — gana prop `image?: ImageRef`, usa LocationImage
    └── sheets/
        └── LockedSheet.tsx        # MODIFICADO — usa LocationImage con preview.thumbnail

app/
├── location/
│   └── [id].tsx                   # MODIFICADO — usa LocationImage con full.detailImage
├── (tabs)/
│   └── saved.tsx                  # MODIFICADO — pasa item.thumbnail a ListCard
└── tip/
    └── [id].tsx                   # MODIFICADO — pasa location.thumbnail a ListCard

__tests__/
├── components/
│   └── location-image.test.tsx    # NUEVO — recaída a ImagePlaceholder con resolver falso (FR-004)
└── screens/
    ├── location-detail.test.tsx   # MODIFICADO — añade el caso de imagen real visible
    ├── locked-sheet.test.tsx      # MODIFICADO — ídem
    ├── saved.test.tsx             # MODIFICADO — ídem
    └── tip-detail.test.tsx        # MODIFICADO — ídem
```

**Structure Decision**: no se crea ningún directorio nuevo de primer nivel. Un componente de UI
nuevo (`LocationImage`) se añade junto a `ImagePlaceholder` en `src/ui/components/`, siguiendo
la organización ya establecida por las features 001-003 (núcleo en `src/core/`, adaptadores de
plataforma en `src/platform/`, presentación en `src/ui/` y rutas en `app/`). No aplica ninguna
de las estructuras alternativas del template (esto no es ni backend+frontend ni API+móvil: es
una única app Expo).

## Complexity Tracking

*No aplica — el Constitution Check no registra violaciones que justificar.*
