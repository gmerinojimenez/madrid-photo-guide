---
description: "Task list for feature 001 — app skeleton + CI (Expo / React Native)"
---

# Tasks: Esqueleto de aplicación multiplataforma con verificación automática

**Input**: Design documents from `/specs/001-app-skeleton-ci/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/build-interface.md](./contracts/build-interface.md), [quickstart.md](./quickstart.md)

**Tests**: Solo se genera la prueba de ejemplo exigida por FR-007/FR-008. Los tests de
comportamiento y de aceptación se difieren (no hay dominio ni interacción todavía — ver
Complexity Tracking de [plan.md](./plan.md)).

**Stack** (de [research.md](./research.md)): Expo SDK `57.0.19`, React Native (la que fija
el SDK), TypeScript `~6.x` (NO 7.0), `jest-expo` `57.0.5`,
`@testing-library/react-native` `14.0.1`, `eslint-config-expo` + Prettier. Plantilla
`blank-typescript`. App de módulo único en la raíz del repositorio.

**Format**: `[ID] [P?] [Story?] Description with file path`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicializar el proyecto Expo y su tooling sobre el repositorio ya limpio
(que hoy solo contiene `README.md`, `.gitignore`, `specs/`, `.specify/`, `.claude/`).

- [X] T001 Scaffold la app Expo con la plantilla `blank-typescript` en la raíz del repo (`npx create-expo-app@latest . --template blank-typescript`), conservando el `README.md` y `.gitignore` ya existentes y aceptando/mezclando el resto de ficheros generados (`App.tsx`, `app.json`, `index.ts`, `package.json`, `tsconfig.json`, `babel.config.js`, `assets/`)
- [X] T002 Fijar en `package.json` las versiones exactas de [research.md](./research.md) D-002 (`expo@57.0.19`, y `typescript` en la versión que resuelva `npx expo install typescript` — nunca 7.x), y ejecutar `npm install` para regenerar `package-lock.json`
- [X] T003 [P] Añadir a `package.json` los scripts `typecheck` (`tsc --noEmit`), `lint` (`expo lint`), `test` (`jest`), `start` (`expo start`), `android` (`expo run:android`), `ios` (`expo run:ios`) y el campo `engines.node` `">=22.13.0"`; crear `.nvmrc` con `22`
- [X] T004 [P] Configurar `tsconfig.json` con `"strict": true` extendiendo `expo/tsconfig.base`, sin `any` implícito permitido
- [X] T005 [P] Ejecutar `npx expo lint` para generar `eslint.config.js` (flat config, `eslint-config-expo`), instalar `prettier eslint-config-prettier eslint-plugin-prettier` como devDependencies, enchufar `eslintPluginPrettierRecommended` en `eslint.config.js` y crear `.prettierrc` en la raíz
- [X] T006 [P] Verificar que `.gitignore` de la raíz ignora `node_modules/`, `.expo/`, `/ios` y `/android` (generación nativa continua); añadir cualquier entrada que la plantilla espere y falte (p. ej. `expo-env.d.ts`)

**Checkpoint**: `npm ci` funciona en limpio y `npm run typecheck` / `npm run lint` pasan sobre el proyecto recién scaffoldeado.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: La pantalla compartida y la infraestructura de pruebas. Todo esto es común a
US1 y US2 (una única base de código Expo), por lo que bloquea ambas historias.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase.

- [X] T007 [P] Configurar la identidad de la app en `app.json` según [data-model.md](./data-model.md): `expo.name` = `Madrid Photo Guide`, `expo.slug` = `madrid-photo-guide`, `expo.android.package` = `com.gmj.madridphotoguide`, `expo.ios.bundleIdentifier` = `com.gmj.madridphotoguide`; dejar icono y splash de marcador de posición generados por la plantilla
- [X] T008 Implementar la pantalla raíz en `App.tsx` según [research.md](./research.md) D-007 y [contracts/build-interface.md](./contracts/build-interface.md) §3/§4: envolver en `SafeAreaProvider` + `SafeAreaView` (`react-native-safe-area-context`), pintar el fondo del color del tema leyendo `useColorScheme()`, sin texto, sin logotipo, sin navegación; **eliminar el texto de plantilla** ("Open up App.tsx...") y su `StatusBar`/estilos sobrantes que no apliquen
- [X] T009 [P] Configurar Jest en `package.json` con `"preset": "jest-expo"` e instalar `jest-expo@57.0.5` y `@testing-library/react-native@14.0.1` como devDependencies (`npx expo install jest-expo` + `npm i -D @testing-library/react-native`)
- [X] T010 Crear la prueba de ejemplo en `__tests__/App.test.tsx` (FR-007, FR-008): renderiza `<App />` con `render()` de `@testing-library/react-native` y afirma que monta sin lanzar; es un marcador de posición que solo valida que la infraestructura de tests corre

**Checkpoint**: `npm test` ejecuta y pasa la prueba de ejemplo (Validación 1 de [quickstart.md](./quickstart.md)); `App.tsx` compila y pasa typecheck + lint.

---

## Phase 3: User Story 1 - Arrancar la app en Android (Priority: P1) 🎯 MVP

**Goal**: Instalar y abrir la app en Android hasta una pantalla vacía estable.

**Independent Test**: `npm run android` sobre un emulador/dispositivo limpio → la app
aparece en el lanzador como **Madrid Photo Guide**, abre a una pantalla vacía y no se cierra.

- [X] T011 [US1] Revisar la sección `expo.android` de `app.json`: `package` correcto, icono adaptativo de marcador de posición, sin permisos declarados (arranque sin red, FR-005); no añadir nada que iOS no vaya a tener (paridad)
- [X] T012 [US1] Ejecutar `npm run android` con un emulador/dispositivo conectado y confirmar que `expo prebuild` + build Gradle generan el APK, se instala y la app arranca a la pantalla vacía del tema
- [X] T013 [US1] Validar sobre Android los 6 puntos de la Validación 2 de [quickstart.md](./quickstart.md) (segundo plano/primer plano, modo avión, rotación, claro/oscuro, safe areas) + 10 arranques en frío sobre instalación limpia (SC-001) + cronometrar arranque < 2 s (SC-002)

**Checkpoint**: US1 completamente funcional y verificable de forma independiente en Android.

---

## Phase 4: User Story 2 - Arrancar la app en iOS (Priority: P1)

**Goal**: Instalar y abrir la app en iOS hasta la misma pantalla vacía que en Android.

**Independent Test**: `npm run ios` sobre un simulador/dispositivo limpio → la app abre a la
misma pantalla vacía, no se cierra, y no ofrece ninguna capacidad que Android no tenga.

- [X] T014 [US2] Revisar la sección `expo.ios` de `app.json`: `bundleIdentifier` correcto, icono de marcador de posición, deployment target por defecto del SDK (sin override propio)
- [X] T015 [US2] Ejecutar `npm run ios` con CocoaPods instalado y un simulador disponible; confirmar que `expo prebuild` regenera `ios/`, `pod install` resuelve y la app arranca a la misma pantalla vacía del tema
- [X] T016 [US2] Validar sobre iOS los 6 puntos de la Validación 3 de [quickstart.md](./quickstart.md) y la paridad de la Validación 4 (mismo contenido observable, misma respuesta a modo oscuro, cero diferencias de capacidad entre plataformas — FR-004, SC-007)

**Checkpoint**: US1 y US2 funcionan de forma independiente; la pantalla es literalmente el mismo `App.tsx` en ambas.

---

## Phase 5: User Story 3 - Verificación automática en cada cambio (Priority: P2)

**Goal**: Cada cambio propuesto dispara sola una verificación que corre typecheck + lint +
tests y publica un resultado visible.

**Independent Test**: abrir un PR con un cambio cualquiera → el workflow arranca sin
intervención y publica un check verde/rojo en ese PR.

- [X] T017 [US3] Crear `.github/workflows/ci.yml` según [contracts/build-interface.md](./contracts/build-interface.md) §4 y [research.md](./research.md) D-004: runner `ubuntu-latest`, disparadores `pull_request` (cualquier rama) y `push` a `main`, `actions/setup-node` con Node 22 y `cache: npm`, pasos en orden `npm ci` → `npm run typecheck` → `npm run lint` → `npm test`; sin compilación de binarios Android/iOS
- [X] T018 [US3] Abrir un pull request con un cambio trivial y confirmar (Validación 5 de [quickstart.md](./quickstart.md)) que el workflow se dispara solo, publica un check visible en el PR (FR-009, FR-010) y termina en verde muy por debajo de 15 min (SC-005)
- [X] T019 [US3] Invertir la aserción de `__tests__/App.test.tsx`, empujar al PR y confirmar (Validación 6) que el check pasa a rojo identificando el test y el motivo en el log (SC-006, FR-011); revertir y confirmar que vuelve a verde sobre el contenido actualizado (escenario 3.4)

**Checkpoint**: las tres historias son independientemente funcionales.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cerrar FR-013 (reproducibilidad por una persona nueva) y la validación global.

- [X] T020 [P] Actualizar `README.md` con prerrequisitos reales (Node ≥ 22.13, Xcode 16+ con runtime de simulador, CocoaPods, Android SDK) y todos los comandos (`npm ci`, `npm run typecheck|lint|test|android|ios`), enlazando a [quickstart.md](./quickstart.md) para la validación paso a paso
- [X] T021 [P] Verificar SC-003 en un clon limpio (Validación 7 de [quickstart.md](./quickstart.md)): `git clone` → `npm ci` → `npm run typecheck && npm run lint && npm test` en menos de 30 min siguiendo solo el `README.md`, sin conocimiento tácito
- [X] T022 Ejecutar la validación completa de [quickstart.md](./quickstart.md) (las 7) y marcar el criterio de entrega; anotar cualquier desviación

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — empieza ya. T001 primero; T003–T006 en paralelo tras T002.
- **Foundational (Phase 2)**: depende de Phase 1. Bloquea todas las historias. T008 antes de T010 (el test importa `App`); T007 y T009 en paralelo con T008.
- **User Stories (Phase 3–5)**: todas dependen de Phase 2. Luego son independientes entre sí y pueden ir en paralelo.
- **Polish (Phase 6)**: depende de US1, US2 y US3 completas.

### User Story Dependencies

- **US1 (P1)**: solo depende de Foundational. Sin dependencias de otras historias.
- **US2 (P1)**: solo depende de Foundational. Comparte `App.tsx` con US1 pero se prueba por separado.
- **US3 (P2)**: solo depende de Foundational (necesita `package.json` con scripts y el test de T010, ambos de fases previas). Independiente de US1/US2.

### Within Each User Story

- Config de plataforma (`app.json`) → ejecutar el build → validar. Secuencial dentro de la historia.
- US3: crear `ci.yml` → validar disparo en PR → validar fallo en rojo. Secuencial.

### Parallel Opportunities

- Setup: T003, T004, T005, T006 en paralelo tras T002.
- Foundational: T007 y T009 en paralelo con T008.
- Tras Foundational: US1, US2 y US3 en paralelo si hay capacidad.
- Polish: T020 y T021 en paralelo.

---

## Parallel Example: Phase 1 (Setup)

```bash
# Tras T001 (scaffold) y T002 (versiones), lanzar en paralelo:
Task: "T003 Añadir scripts npm + engines.node + .nvmrc en package.json"
Task: "T004 Configurar tsconfig.json con strict:true"
Task: "T005 Configurar ESLint (eslint-config-expo) + Prettier"
Task: "T006 Verificar .gitignore para node_modules/.expo//ios//android"
```

## Parallel Example: después de Foundational

```bash
# Con Phase 2 completa, tres frentes en paralelo:
Dev A: "Phase 3 (US1) — arranque y validación en Android (T011–T013)"
Dev B: "Phase 4 (US2) — arranque y validación en iOS (T014–T016)"
Dev C: "Phase 5 (US3) — workflow de CI y su validación (T017–T019)"
```

---

## Implementation Strategy

### MVP First (US1 solamente)

1. Phase 1: Setup (T001–T006)
2. Phase 2: Foundational (T007–T010) — CRÍTICO, bloquea todo
3. Phase 3: US1 (T011–T013) — app arranca en Android hasta pantalla vacía
4. **STOP y VALIDAR**: probar US1 de forma independiente
5. Demo si procede

### Incremental Delivery

1. Setup + Foundational → base lista (`npm test` verde, `App.tsx` compone)
2. + US1 → validado en Android → demo (MVP)
3. + US2 → validado en iOS + paridad → demo
4. + US3 → CI disparándose en cada PR, rojo demostrado → demo
5. Polish → README y reproducibilidad desde cero

---

## Notes

- `[P]` = ficheros distintos, sin dependencias entre sí.
- `[USx]` mapea la tarea a su historia para trazabilidad.
- `ios/` y `android/` no se versionan: los regenera `expo prebuild` en T012/T015.
- No se compila ningún binario en CI (D-004); FR-001/FR-002 se verifican en T012/T015 manualmente.
- Commit tras cada tarea o grupo lógico, con tipos `feat:`/`fix:` únicamente.
- Las tareas T013, T016 y T018/T019 son de validación manual: no producen código, cierran criterios de aceptación.

---

## Estado final

**Completada el 2026-09-09.** Las 22 tareas verificadas:

- T001–T011, T014, T017, T020 — código, con `typecheck` / `lint` / `test` / `expo-doct` en verde.
- T012, T015 — dev build compilada y arrancada en emulador Android (`Pixel_9a`) y simulador iOS (iPhone 17 Pro).
- T013, T016 — 6 checks por plataforma + SC-001/SC-002 validados a mano.
- Paridad (FR-004, SC-007) — verificada con ambas apps abiertas a la vez.
- T018, T019 — CI del PR #1: verde en cambio normal, rojo identificando el test al romper la aserción, verde de nuevo al revertir.
- T021, T022 — clon limpio reproducible siguiendo solo el README; quickstart completo.
