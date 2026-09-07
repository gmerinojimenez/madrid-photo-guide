# Phase 0 — Research: Esqueleto de aplicación multiplataforma con verificación automática

**Feature**: `001-app-skeleton-ci` | **Date**: 2026-09-04

Segunda iteración de esta fase. La primera (2026-09-01) investigó un stack Kotlin
Multiplatform y se implementó (commit `dd5bec6`). El 2026-09-04 la constitución se
reescribió para fijar el stack del proyecto en **Expo / React Native / TypeScript**
(commit `3154f35`), lo que invalida esa investigación y esa implementación para cualquier
feature nueva. El código KMP se conserva en la rama `archive/kmp-skeleton-001` por si hace
falta consultarlo; no se reutiliza nada de él aquí.

Todas las versiones de este documento se han consultado hoy mismo contra fuentes reales
(npm, changelog oficial de Expo/React Native, GitHub de las herramientas), no de memoria.
El toolchain local se ha inspeccionado directamente.

## Entorno verificado en la máquina de desarrollo

| Elemento | Valor observado | ¿Suficiente? |
|---|---|---|
| Node.js | v18.18.0 | ❌ Expo SDK 57 exige Node ≥ 22.13.x |
| npm | 9.8.1 | Se sustituye por el npm que trae Node 22 |
| Yarn Classic | 1.22.22 | No se usa (ver D-001) |
| Watchman | ausente | Opcional: Metro cae a un watcher de Node, más lento pero funcional |
| Xcode | 26.6 (build 17F113) | ✅ |
| Runtimes iOS de simulador | 26.4, 26.5 | ✅ |
| CocoaPods | ausente | ⚠️ Necesario para compilar el proyecto iOS generado por `expo prebuild` / `expo run:ios` en local |
| Android SDK | platforms 35–37.2, build-tools presentes | ✅ |
| Remoto git | `git@github.com:gmerinojimenez/madrid-photo-guide.git` (GitHub) | ✅ — GitHub Actions es la plataforma de CI correcta (FR-009) |

**Consecuencia**: hay dos huecos de entorno que documentar en el quickstart, no que resolver
en este plan: actualizar Node a ≥22.13 (recomendado: gestor de versiones tipo `nvm`/`fnm`,
sin fijar una herramienta concreta que la constitución no exige) e instalar CocoaPods antes
de poder compilar el proyecto iOS en local. Ninguno de los dos bloquea la ejecución en CI
(ver D-004): un runner de GitHub Actions fresco ya cumple ambos.

---

## D-001: Estructura del proyecto y plantilla de partida

**Decisión**: una única app Expo generada con la plantilla oficial **`blank-typescript`**
(`npx create-expo-app@latest --template blank-typescript`) en la raíz del repositorio.
Gestor de paquetes: **npm** (con `package-lock.json` versionado).

**Rationale**: la plantilla `blank-typescript` no trae Expo Router ni ninguna navegación,
que es exactamente lo que exige FR-014 ("el proyecto NO DEBE incluir... pantallas de
navegación... en esta entrega"). La plantilla `default` sí integra Expo Router y habría que
retirarlo a mano, apostando en sentido contrario a lo que pide la spec. `npm` se prefiere a
Yarn Classic (obsoleto, sin soporte de workspaces útil aquí) o a pnpm (sin ventaja para un
proyecto de un módulo); ya está disponible con Node y es lo que documenta Expo por defecto.

**Alternativas consideradas**:
- *Plantilla `default` (Expo Router) retirando la navegación después*: rechazado. Añade y
  luego quita código, y dificulta verificar FR-014 en revisión.
- *Monorepo con Turborepo/Nx desde el día uno*: rechazado. Un solo módulo sin dominio
  todavía no justifica la complejidad de un monorepo; se reevaluará si aparece necesidad
  real de compartir código con algo que no sea la propia app.

---

## D-002: Versiones del toolchain

**Decisión**: fijar en `package.json` las siguientes versiones, todas estables y
verificadas hoy contra npm y los changelogs oficiales:

| Componente | Versión | Fuente consultada |
|---|---|---|
| Expo SDK | `57.0.19` | npm / [changelog Expo SDK 57](https://expo.dev/changelog/sdk-57) — última estable |
| React Native | `0.86.x` (la que fija Expo SDK 57) | changelog Expo SDK 57 |
| TypeScript | `~6.0.x` (última versión resuelta por `npx expo install typescript`) | ver D-003 — **no** se usa TypeScript 7 |
| jest-expo | `57.0.5` | npm |
| @testing-library/react-native | `14.0.1` | npm |
| eas-cli | `23.2.0` (dev dependency / uso vía `npx`, no en CI de esta feature) | npm — ver D-004 |
| Node.js (motor exigido) | `>=22.13.0` | requisito mínimo de Expo SDK 57 |

**Alternativas consideradas**: fijar Expo SDK 56 (más probado). Rechazado por el mismo
argumento que en la iteración KMP: el proyecto nace hoy, sin deuda que arrastrar; SDK 57 es
la versión estable publicada y soportada activamente.

---

## D-003: TypeScript 7 se descarta explícitamente por ahora

**Decisión**: fijar TypeScript en la última versión de la generación **anterior** al
compilador reescrito en Go (TypeScript 7.0, GA el 8 de julio de 2026), es decir la que
resuelve `npx expo install typescript` hoy. Se revisará cuando el ecosistema se ponga al
día.

**Rationale**: TypeScript 7.0 no expone todavía una API programática estable — el propio
equipo de Microsoft la sitúa en la versión 7.1, "varios meses" por delante. Como
consecuencia directa, a día de hoy:
- `typescript-eslint` no soporta TypeScript 7.0 (su rango de peer dependency corta antes).
- `ts-jest` restringe explícitamente el rango a TypeScript < 7.
- Hay un issue abierto en el propio repositorio de Expo sobre `app.config.ts` sin compilar
  bajo TypeScript 7.

Adoptar TypeScript 7 hoy rompería precisamente las dos puertas de CI que la constitución
exige sin excepción (comprobación de tipos, y linter — vía `typescript-eslint`). Es la misma
lógica que D-006 aplicó a detekt en la iteración KMP: no se satisface una puerta obligatoria
con una herramienta que hoy está rota, aunque sea la más nueva.

**Alternativas consideradas**: adoptar TypeScript 7 y `noEmit`/type-check con un caso
especial sin `typescript-eslint`. Rechazado: dejaría la puerta de linter de tipos sin
cobertura real, que es justo la puerta que existe para atrapar errores de tipo.

**Revisión futura**: reevaluar en cuanto `typescript-eslint` y `ts-jest` publiquen soporte
para TypeScript 7 (el propio ecosistema apunta a la serie 7.1).

---

## D-004: Alcance del pipeline de CI

**Decisión**: un único workflow de GitHub Actions sobre **`ubuntu-latest`** (no
`macos-latest`), disparado por `pull_request` y por `push` a `main`, con estos pasos:

1. `npm ci`
2. `npx tsc --noEmit` — comprobación de tipos (puerta constitucional).
3. `npx expo lint` — ESLint (`eslint-config-expo`) + Prettier vía `eslint-plugin-prettier`
   (puerta constitucional de linter y formato).
4. `npx jest` — batería de tests unitarios (`jest-expo`), incluida la prueba de ejemplo
   exigida por FR-007.

No se compila ningún binario instalable (ni APK ni app iOS) en este workflow.

**Rationale — por qué `ubuntu-latest` y no `macos-latest`**: a diferencia de KMP, aquí
compilar binarios reales de Android e iOS no es una tarea de Gradle/Xcode local gratuita:
la constitución fija **EAS Build** como mecanismo de build y distribución, un servicio
gestionado de pago (con cuota gratuita limitada) que exige iniciar sesión con una cuenta de
Expo y consumir crédito de compilación en cada ejecución. Disparar un build de EAS en cada
PR sin que el usuario lo haya pedido gastaría cuota de un servicio de terceros por decisión
unilateral de esta feature — exactamente el tipo de coste que estas guías piden confirmar,
no asumir. `ubuntu-latest` however cubre de sobra lo que sí es gratis y determinista: type
check, lint y tests unitarios corren igual en Linux que en macOS porque Metro/Jest no
compilan código nativo para eso.

**Consecuencia para FR-001/FR-002 (app instalable en ambas plataformas)**: su verificación
queda en el terreno manual del quickstart (validaciones 2 y 3), igual que ya asumía la
iteración anterior de la spec. Añadir compilación real a CI —local vía `expo prebuild` en
runners separados, o vía EAS Build— queda como decisión explícita para una iteración
posterior, cuando el coste (tiempo de runner macOS, o crédito de EAS) se sopese con el
usuario. Se dejará constancia de esta decisión en el Complexity Tracking del plan.

**Alternativas consideradas**:
- *`macos-latest` + `expo prebuild` + `xcodebuild`/Gradle local, sin EAS*: viable en teoría,
  pero exige mantener en CI el mismo par de huecos que en la máquina local (CocoaPods,
  Android SDK) más el tiempo de un runner macOS, solo para producir un binario que nadie
  instala en esta entrega. Se descarta por desproporcionado frente a FR-009/FR-012, que
  piden verificación reproducible y rápida, no un build de distribución.
- *EAS Build en CI con `EXPO_TOKEN`*: rechazado para esta feature por el coste de cuota ya
  explicado; candidato natural para la feature que introduzca distribución real.

---

## D-005: Identidad de la app

**Decisión**: se mantiene la identidad ya fijada en la iteración KMP, por ser la decisión
más cara de revertir de todo el proyecto y no depender del framework elegido:

| Parámetro | Valor |
|---|---|
| `slug` / nombre de proyecto | `madrid-photo-guide` |
| Nombre visible | `Madrid Photo Guide` |
| Android `package` | `com.gmj.madridphotoguide` |
| iOS `bundleIdentifier` | `com.gmj.madridphotoguide` |
| iOS deployment target (vía Expo SDK 57) | el que fija el SDK por defecto |
| Android `minSdkVersion` (vía Expo SDK 57) | el que fija el SDK por defecto |
| Icono | marcador de posición generado, distinguible en el lanzador |

**Rationale**: el identificador de aplicación es inmutable una vez publicado en cualquiera
de las dos tiendas. No hay motivo para cambiarlo solo porque cambió el framework.

**EAS project ID**: no se provisiona en esta feature (no se ejecuta `eas init`). Requeriría
una cuenta de Expo y queda fuera de alcance junto con el resto de distribución (Assumption
de la spec: "Distribución fuera de alcance").

---

## D-006: Pruebas

**Decisión**: `jest-expo` como preset de Jest, `@testing-library/react-native` disponible
para cuando exista comportamiento que probar. La prueba de ejemplo exigida por FR-007 vive
en `__tests__/App.test.tsx` (o equivalente) y valida únicamente que la infraestructura de
tests se ejecuta.

**Rationale**: `jest-expo` es el preset oficial de Expo (mockea el SDK nativo) y es lo único
necesario para que `npx jest` funcione sin simulador ni emulador, cumpliendo el principio
III ("estos tests DEBEN ser rápidos y no requerir simulador").

**Nota de constitución (principio III)**: igual que en la iteración KMP, esta feature
entrega solo la prueba de ejemplo, no tests de dominio ni de aceptación, porque no existe
comportamiento todavía. La verificación de las historias 1 y 2 (arranque) es manual en esta
entrega. Ver Complexity Tracking del plan.

---

## D-007: Qué es exactamente "una pantalla en blanco"

**Decisión**: el componente raíz (`App.tsx`) envuelve su contenido en `SafeAreaProvider` /
`SafeAreaView` (paquete `react-native-safe-area-context`, que la plantilla de Expo ya
incluye) y usa `useColorScheme()` de React Native para pintar el fondo según el modo claro
u oscuro del sistema. Sin texto, sin logotipo, sin navegación.

**Rationale**: idéntico al de la iteración KMP — una pantalla vacía que ya respeta insets y
apariencia demuestra que el ciclo de vida y el tema están bien conectados en ambas
plataformas, que es lo único que esta feature tiene que probar.

**Alternativas consideradas**: mostrar un texto de plantilla ("Open up App.tsx..."), que es
lo que trae la plantilla de Expo por defecto. Rechazado y **debe eliminarse** explícitamente
del `App.tsx` generado: el usuario pidió una pantalla en blanco, no el placeholder del
framework.

---

## Incógnitas pendientes

Ninguna bloqueante. Dos huecos de entorno local documentados arriba (Node, CocoaPods) que no
afectan a CI y se resuelven en el quickstart antes de la primera compilación local.
