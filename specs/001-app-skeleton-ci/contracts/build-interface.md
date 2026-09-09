# Phase 1 — Contract: superficie de scripts y arranque

**Feature**: `001-app-skeleton-ci` | **Date**: 2026-09-04

Esta feature no expone API de red ni de librería. Su interfaz real —lo que otros consumen y
lo que rompe cosas al cambiar— es doble: los scripts de `package.json` (consumidos por la
persona desarrolladora y por CI) y el contrato observable de la pantalla inicial. Este
documento los fija.

Cambiar cualquier nombre de esta página rompe algo fuera del fichero donde se define. Ese
es el criterio para que esté aquí.

---

## 1. Scripts de `package.json` (consumidos por la persona desarrolladora y por CI)

| Script | Comando | Qué garantiza |
|---|---|---|
| `typecheck` | `tsc --noEmit` | Comprobación de tipos sin emitir salida. Puerta de CI |
| `lint` | `expo lint` | ESLint (`eslint-config-expo`) + Prettier. Puerta de CI |
| `test` | `jest` | Batería `jest-expo` en `__tests__/`, incluida la prueba de ejemplo (FR-007). Puerta de CI |
| `start` | `expo start` | Arranque en modo desarrollo (Metro) para iterar con Expo Go o un dev client |
| `android` | `expo run:android` | Compila e instala la app en un emulador/dispositivo Android conectado (FR-001) |
| `ios` | `expo run:ios` | Compila e instala la app en un simulador/dispositivo iOS conectado (FR-002) |

**Estabilidad**: `typecheck`, `lint` y `test` están referenciados literalmente en
`.github/workflows/ci.yml`. Renombrarlos obliga a actualizar el workflow.

## 2. Punto de entrada de la app

| Elemento | Valor | Contrato |
|---|---|---|
| Componente raíz | `App` (`App.tsx`, exportación por defecto) | Único punto donde se define la pantalla; ninguna plataforma define UI propia (FR-004) |
| Registro de la app | `app.json` → `expo.name` / `expo.slug` | Nombre e identificador visibles en ambos lanzadores (FR-006) |

**Regla de paridad**: no existe código específico de plataforma en esta feature (no hay
ficheros `.ios.tsx`/`.android.tsx`); `App.tsx` es literalmente lo mismo que ejecutan Android
e iOS. El día en que aparezca una bifurcación de plataforma, deberá justificarse en el PR
según el principio I.

## 3. Contrato de la pantalla inicial

Comportamiento observable que las historias 1 y 2 verifican:

- Ocupa la pantalla completa y pinta el color de fondo del tema.
- Respeta las áreas seguras del sistema (notch, isla dinámica, barra de gestos) mediante
  `react-native-safe-area-context`: ningún contenido futuro quedará bajo elementos del
  sistema.
- Sigue la apariencia clara u oscura del sistema (`useColorScheme()`) y cambia con ella.
- No muestra texto, logotipo ni controles — en particular, no el texto de plantilla que
  trae la plantilla de Expo por defecto.
- No realiza ninguna petición de red ni lectura de almacenamiento.

## 4. Contrato del pipeline de CI

**Disparadores**: `pull_request` contra cualquier rama y `push` a `main`.

**Resultado**: un único check visible en el cambio propuesto, con dos estados posibles —
éxito o fallo—, más el estado de error de infraestructura, distinguible por ser un fallo del
runner y no de un paso de verificación (edge case de la spec).

**Pasos, en orden de coste creciente** (falla rápido lo barato):

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

**Entorno**: runner `ubuntu-latest`, Node.js 22.x, caché de npm restaurada entre
ejecuciones. No se compila ningún binario de Android o iOS en este workflow — ver D-004 en
[research.md](../research.md) para el porqué y el criterio de cuándo añadirlo.

**Contrato de diagnóstico** (FR-011): cuando el paso 4 falla, el reporter por defecto de
Jest identifica el test y el motivo en el log, sin necesidad de reproducir en local.
