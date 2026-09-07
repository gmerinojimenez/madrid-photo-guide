# Phase 1 — Quickstart: validar el esqueleto

**Feature**: `001-app-skeleton-ci` | **Date**: 2026-09-04

Guía de validación: qué ejecutar y qué debe ocurrir para dar la feature por entregada. Los
detalles de diseño están en [plan.md](./plan.md) y [research.md](./research.md); los
nombres y comandos estables, en
[contracts/build-interface.md](./contracts/build-interface.md).

## Prerrequisitos

| Requisito | Comprobación | Estado en la máquina actual |
|---|---|---|
| Node.js ≥ 22.13 | `node -v` | ❌ **pendiente** — la máquina tiene v18.18.0, hay que actualizar |
| Xcode 16+ con runtime de simulador iOS | `xcodebuild -version` | ✅ Xcode 26.6, runtimes iOS 26.4/26.5 |
| CocoaPods | `pod --version` | ❌ **pendiente** — necesario para `expo run:ios` en local |
| Android SDK con una plataforma reciente | `ls $ANDROID_HOME/platforms` | ✅ presente en `~/Library/Android/sdk` |

No hace falta instalar Expo CLI globalmente: se usa vía `npx`.

## Validación 1 — La batería de pruebas se ejecuta (FR-007)

```bash
npm ci
npm test
```

**Resultado esperado**: Jest reporta éxito, con la prueba de ejemplo ejecutada. Al no haber
código nativo por target en esta feature, una sola ejecución cubre lo que en KMP exigía
correr en dos targets: no hay una versión distinta del test por plataforma.

## Validación 2 — La app arranca en Android (Historia 1)

```bash
npm run android
```

Con un emulador o dispositivo conectado. Después, abre **Madrid Photo Guide** desde el
lanzador y comprueba:

1. Muestra una pantalla vacía y permanece abierta, sin cierres ni diálogos de error.
2. Enviada a segundo plano y recuperada, sigue en la misma pantalla sin reiniciarse.
3. Con el modo avión activado, arranca igualmente.
4. Al rotar el dispositivo, la pantalla sigue correctamente pintada.
5. Al cambiar el sistema de claro a oscuro, el fondo acompaña el cambio.
6. El contenido no queda bajo el notch ni bajo la barra de gestos.

Repite el arranque 10 veces sobre instalación limpia para dar por cumplido SC-001, y
cronometra el arranque para SC-002 (< 2 s hasta pantalla visible).

## Validación 3 — La app arranca en iOS (Historia 2)

```bash
npm run ios
```

Con CocoaPods instalado (ver Prerrequisitos) y un simulador disponible.

**Comprobaciones**: las mismas seis de la validación 2, sobre el simulador o un dispositivo.

**Si falla el enlazado nativo**: `expo run:ios` regenera el proyecto Xcode con `expo
prebuild` en cada ejecución; el directorio `ios/` no se versiona (generación nativa
continua). Si algo queda inconsistente, bórralo y vuelve a ejecutar el comando.

## Validación 4 — Paridad entre plataformas (FR-004, SC-007)

Con la app abierta simultáneamente en Android y en iOS, compara ambas pantallas iniciales:
mismo contenido observable (vacío), misma respuesta al modo oscuro, ninguna capacidad
presente en una y ausente en la otra. Al compartir literalmente el mismo `App.tsx` sin
ninguna bifurcación de plataforma, la paridad aquí es estructural, no solo observada.

## Validación 5 — La verificación automática funciona (Historia 3)

1. Abre un pull request con un cambio cualquiera.
2. **Esperado**: el workflow arranca solo, sin intervención, y publica un check en el PR
   (FR-009, FR-010).
3. Con todo correcto, el check queda en verde. Al no compilar binarios nativos (ver D-004 en
   research.md), la ejecución completa dura bastante menos que el margen de 15 minutos de
   SC-005.

## Validación 6 — Un fallo se detecta y se explica (SC-006, FR-011)

La comprobación que de verdad valida el pipeline: uno que nunca ha estado en rojo no ha
demostrado nada.

1. Rompe deliberadamente la prueba de ejemplo (invierte su aserción).
2. Súbelo al PR.
3. **Esperado**: el check pasa a rojo, y el log de Jest identifica el test concreto y el
   motivo sin necesidad de reproducir el fallo en local.
4. Revierte el cambio y confirma que el check vuelve a verde sobre el contenido actualizado
   (escenario 3.4).

## Validación 7 — Reproducible desde cero (FR-012, FR-013, SC-003)

En un directorio limpio, con Node ≥ 22.13 ya instalado:

```bash
git clone git@github.com:gmerinojimenez/madrid-photo-guide.git
cd madrid-photo-guide
npm ci
npm run typecheck && npm run lint && npm test
```

**Esperado**: funciona siguiendo solo el README, sin conocimiento tácito ni pasos manuales
no documentados, en menos de 30 minutos incluyendo descargas. Levantar la app instalable en
un dispositivo (validaciones 2 y 3) exige además Xcode/Android SDK/CocoaPods, ya cubiertos
por los Prerrequisitos.

## Criterio de entrega

La feature está completa cuando las siete validaciones pasan. Las validaciones 2, 3 y 4 son
manuales en esta entrega —no hay comportamiento de usuario automatizable todavía— según lo
registrado en el Complexity Tracking de [plan.md](./plan.md).
