# Implementation Plan: Esqueleto de aplicación multiplataforma con verificación automática

**Branch**: `001-app-skeleton-ci` | **Date**: 2026-09-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-app-skeleton-ci/spec.md`

**Nota de reinicio**: esta es la segunda versión de este plan. La primera (2026-09-01) diseñó e
implementó un esqueleto en Kotlin Multiplatform (commit `dd5bec6`). El 2026-09-04 la
constitución se reescribió para fijar el stack en Expo / React Native / TypeScript (commit
`3154f35`), lo que la dejó incompatible con el plan y el código existentes. Por decisión
explícita del usuario, el código KMP se retiró de esta rama a `archive/kmp-skeleton-001` y
este plan se redacta desde una base de código vacía. Ningún artefacto de la versión anterior
se reutiliza; solo la spec (agnóstica de tecnología) y la identidad de la app (D-005 de
research.md) sobreviven sin cambios.

## Summary

Crear la base del proyecto: una app Expo (React Native + TypeScript) que arranca en Android
y en iOS hasta una pantalla vacía correctamente compuesta, más un pipeline de GitHub Actions
que verifica automáticamente cada cambio.

El enfoque es una única app generada con la plantilla oficial `blank-typescript` (sin Expo
Router, sin navegación, en línea con FR-014), con la pantalla definida en un único `App.tsx`
que consumen literalmente Android e iOS sin ninguna bifurcación de plataforma. La batería de
pruebas es Jest (`jest-expo`) con la prueba de ejemplo exigida por la spec. El pipeline corre
en `ubuntu-latest` y verifica tipos, lint/formato y tests — no compila binarios instalables,
porque eso exigiría el servicio de pago EAS Build o un runner macOS solo para un artefacto
que nadie instala en esta entrega (ver D-004 de research.md).

Todas las versiones del toolchain se han verificado contra fuentes reales hoy; ver
[research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (última versión compatible con el ecosistema de tooling —
explícitamente NO TypeScript 7.0, ver research.md D-003), React Native vía Expo SDK 57

**Primary Dependencies**: Expo SDK `57.0.19`, `jest-expo` `57.0.5`,
`@testing-library/react-native` `14.0.1`, `react-native-safe-area-context` (incluido en la
plantilla), `eslint-config-expo` + Prettier

**Storage**: N/A — esta feature no persiste nada

**Testing**: Jest con preset `jest-expo`, ejecutado vía `npm test` (`jest`) — sin necesidad
de simulador ni emulador

**Target Platform**: Android e iOS, en las versiones mínimas que fija Expo SDK 57 por
defecto (sin overrides propios en esta feature)

**Project Type**: Aplicación móvil multiplataforma (Expo / React Native), sin servidor
propio

**Performance Goals**: pantalla inicial visible en menos de 2 s en gama media (SC-002);
pipeline de CI muy por debajo de los 15 min de SC-005 al no compilar binarios nativos

**Constraints**: sin backend propio ni servicios remotos en esta entrega; arranque sin red;
Node.js ≥ 22.13 (requisito de Expo SDK 57); CocoaPods requerido solo para compilar iOS en
local, no en CI

**Scale/Scope**: 1 app, 1 pantalla vacía, 1 prueba de ejemplo, 1 workflow de CI. Sin
contenido de guía, navegación, telemetría, banderas ni compras (FR-014)

## Constitution Check

*GATE: evaluado antes de Phase 0 y reevaluado tras Phase 1.*

| Principio | Aplicación en esta feature | Estado |
|---|---|---|
| **I. Núcleo compartido en TypeScript puro** | No existe todavía dominio que separar de la UI: la app entera es un `App.tsx` sin lógica de negocio. No se introduce ningún fichero `.ios.tsx`/`.android.tsx`; Android e iOS ejecutan literalmente el mismo componente. El principio queda trivialmente respetado por ausencia de superficie que pueda violarlo. | ✅ PASS |
| **II. Serverless y cliente-primero** | No se añade Firebase, RevenueCat ni backend propio. La app arranca sin red (FR-005, escenario 1.3). | ✅ PASS |
| **III. Testing por feature (NO NEGOCIABLE)** | Se entrega una prueba de ejemplo con Jest, no tests de comportamiento ni de aceptación con React Native Testing Library. | ⚠️ DESVIACIÓN JUSTIFICADA — ver Complexity Tracking |
| **IV. Firebase como plano de observabilidad** | No se integra Firebase en esta entrega. No se añade ningún SDK alternativo de analítica, flags o crashes. | ✅ PASS (no aplica todavía) |
| **V. Paridad funcional** | Ambas plataformas ejecutan el mismo `App.tsx`; no hay divergencia posible porque no hay código específico de plataforma que escribir en esta feature (FR-004, SC-007). | ✅ PASS |
| **VI. Freemium de compra única** | Sin cuentas, sin autenticación, sin facturación en esta entrega. | ✅ PASS (no aplica todavía) |
| **Restricciones tecnológicas** | Expo SDK gestionado sobre React Native, TypeScript con `strict`. Plantilla `blank-typescript` en lugar de `default` para no traer Expo Router (FR-014, D-001). `ios/`/`android/` no se versionan (generación nativa continua) — se añaden a `.gitignore`. Sin Firebase todavía, por lo que Expo Go sería técnicamente suficiente para esta feature; se opta igualmente por `expo run:android`/`expo run:ios` (dev client / build local) para no cambiar de flujo cuando llegue Firebase. Sin secretos embebidos (no hay ninguno todavía). | ✅ PASS |
| **Puertas de CI** (comprobación de tipos, linter y formato, tests unitarios, tests de aceptación) | Cubiertas `tsc --noEmit`, `expo lint` (ESLint + Prettier) y `jest`. La puerta de tests de aceptación queda sin cobertura automatizada en esta entrega por la misma razón que el principio III — ver Complexity Tracking. A diferencia de la iteración KMP, aquí **no** hace falta enmendar la constitución para tener linter/formato: `eslint-config-expo` está al día con el Expo SDK 57 elegido (D-004 de research.md). | ⚠️ DESVIACIÓN JUSTIFICADA (solo tests de aceptación) — ver Complexity Tracking |
| **Commits `feat:`/`fix:`** | Se respeta en la implementación. | ✅ PASS |

**Resultado de la puerta**: PASA con una desviación registrada y justificada (ausencia de
tests de aceptación automatizados por falta de comportamiento de dominio), la misma que ya
se había aceptado y documentado en la iteración KMP de este plan.

**Reevaluación post-Phase 1**: sin cambios. El diseño de Phase 1 no introduce ningún
elemento nuevo que roce la constitución; en particular, la decisión de no compilar binarios
en CI (D-004) no es una desviación de un principio, sino una decisión de alcance ya prevista
como abierta en las Assumptions de la spec.

## Project Structure

### Documentation (this feature)

```text
specs/001-app-skeleton-ci/
├── plan.md              # Este fichero
├── spec.md              # Especificación de la feature
├── research.md          # Phase 0 — decisiones D-001..D-007 con versiones verificadas
├── data-model.md        # Phase 1 — sin entidades (documentado y razonado)
├── quickstart.md        # Phase 1 — guía de validación ejecutable
├── contracts/
│   └── build-interface.md   # Phase 1 — superficie de scripts y contrato de arranque
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 — lo genera /speckit-tasks, NO este comando
```

### Source Code (repository root)

```text
App.tsx                        # Único componente: pantalla vacía, safe areas, tema claro/oscuro
app.json                       # Configuración de Expo: nombre, slug, bundle/package ids
index.ts                       # Entry point que registra App con Expo
package.json                   # Scripts (ver contracts/build-interface.md) y dependencias
package-lock.json
tsconfig.json                  # `strict: true`, extiende la base de Expo
babel.config.js
eslint.config.js               # eslint-config-expo + integración de Prettier
.prettierrc
.gitignore                     # Incluye ios/ y android/ (generación nativa continua)

__tests__/
└── App.test.tsx               # Prueba de ejemplo (FR-007, FR-008)

assets/                        # Icono placeholder y splash (generados por la plantilla)

.github/workflows/
└── ci.yml                     # Workflow único: typecheck, lint, tests — ver D-004

README.md                      # Instrucciones de compilación (FR-013)
```

**Structure Decision**: se adopta la disposición estándar de una app Expo de módulo único,
sin monorepo y sin separación en capas todavía (D-001 de [research.md](./research.md)). No
hay `ios/` ni `android/` versionados: `expo run:android`/`expo run:ios` los generan bajo
demanda (`expo prebuild`), en línea con la restricción constitucional de generación nativa
continua.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Principio III y puerta de CI de tests de aceptación**: la feature se entrega con una prueba de ejemplo en lugar de tests unitarios de dominio y tests de aceptación con React Native Testing Library | No existe todavía comportamiento de dominio ni interacción de usuario que probar: el entregable es que la app arranque y que la infraestructura de pruebas exista y se ejecute. La verificación de las historias 1 y 2 es manual en esta entrega, según el quickstart | Escribir tests de aceptación automatizados sobre "la app arranca" no aporta nada que una prueba de humo no dé ya: renderizar `App.tsx` con RNTL y comprobar que no lanza es la misma prueba de ejemplo con más ceremonia. La cobertura de aceptación real llega con la primera feature que introduzca comportamiento de usuario, que sí traerá sus tests según el principio III |
