---

description: "Task list for 004-revenuecat-payments"
---

# Tasks: Compra única y desbloqueo de contenido premium

**Input**: Design documents from `/specs/004-revenuecat-payments/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: **OBLIGATORIOS**, no opcionales. El principio III de la constitución los declara
no negociables y exige, en el mismo PR, unitarios de núcleo en Node y tests de aceptación que
ejerciten el escenario de usuario. Además, esta feature es la que debe cubrir por primera vez
**las cuatro situaciones de acceso** que el principio enumera — sin compra, con compra,
restauración en instalación limpia, y estado indeterminable — saldando la deuda que registró
la feature 003.

**Organization**: agrupadas por historia de usuario, para poder implementarlas y validarlas
por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (ficheros distintos, sin dependencias pendientes)
- **[Story]**: US1, US2, US3 según [spec.md](./spec.md)
- Cada tarea lleva su ruta de fichero exacta

## Path Conventions

Proyecto móvil de un solo paquete (ver [plan.md](./plan.md#project-structure)):

- `src/core/` — TypeScript puro, sin React ni nativo
- `src/platform/` — adaptadores; único lugar donde entra lo nativo
- `src/ui/` — React compartido por las rutas
- `app/` — árbol de rutas de Expo Router (sin lógica de dominio, sin tests)
- `__tests__/core/` — unitarios en Node · `__tests__/screens/` — aceptación con `renderRouter`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependencia, configuración y la barrera de arquitectura que guarda todo lo demás

- [ ] T001 Instalar el SDK con `npx expo install react-native-purchases` y comprobar que `package.json` fija `10.10.1` y que `package-lock.json` queda versionado
- [ ] T002 [P] Declarar `expo.extra.revenuecat` con `iosApiKey`, `androidApiKey` y `entitlementId` en `app.json`, usando marcadores de sustitución al estilo de la clave de Google Maps ya presente
- [ ] T003 [P] Ampliar `__tests__/core/purity.test.ts` con la regla de que ningún fichero de `src/` ni de `app/` importa `react-native-purchases` salvo dentro de `src/platform/purchases/`

**Checkpoint**: la barrera de capas está activa en CI antes de escribir la primera línea del adaptador

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: puertos del dominio, adaptador de tienda, doble de tests y cableado del arranque. Es lo que las tres historias comparten.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta que esta fase esté completa y la suite verde

### Puertos y tipos del núcleo

- [ ] T004 [P] Crear `src/core/entitlement/store-gateway.ts` con `StoreFailure`, `OwnershipQuery`, `PurchaseOutcome`, `RestoreOutcome`, `StorePrice` y la interfaz `StoreGateway`, según [contracts/core-api.md §2.1](./contracts/core-api.md)
- [ ] T005 [P] Crear `src/core/entitlement/lifecycle.ts` con la interfaz `AppLifecycle` (`onForeground`)
- [ ] T006 [P] Crear `src/core/entitlement/cache.ts` con `EntitlementCache` y `preferencesEntitlementCache(prefs)` sobre el puerto `PreferencesStore` existente
- [ ] T007 [P] Escribir unitarios de la caché en `__tests__/core/entitlement-cache.test.ts`: `'1'`→true, `'0'`→false, ausente→null, valor corrupto→false, y que un fallo de escritura no rechaza la promesa

### Orquestador: base

- [ ] T008 Crear `src/core/entitlement/store-backed.ts` con `StoreBackedEntitlementSource` implementando `current()`, `subscribe()` y `hydrate()`, incluida la invariante de no notificar dos veces el mismo valor
- [ ] T009 Escribir unitarios de hidratación en `__tests__/core/entitlement-store-backed.test.ts`: `current()` antes de hidratar devuelve `{ owned: false }`, la caché se publica, y no se consulta a la tienda ni se escribe nada

### Adaptadores de plataforma

- [ ] T010 [P] Crear `src/platform/purchases/config.ts` con `readRevenueCatConfig()` leyendo `expo.extra.revenuecat` vía `expo-constants`, devolviendo `apiKey: null` si falta o es un marcador
- [ ] T011 Crear `src/platform/purchases/revenuecat.ts` con `createRevenueCatGateway(config)`: `configure` una sola vez, selección de clave por plataforma, los cinco métodos de `StoreGateway`, la tabla de mapeo de errores de [research.md D-004](./research.md), y degradación total a `unavailable: 'store'` cuando `apiKey` es `null`
- [ ] T012 [P] Crear `src/platform/system/app-lifecycle.ts` con `appStateLifecycle()` sobre `AppState` de React Native
- [ ] T013 [P] Crear `src/platform/purchases/index.ts` con los reexportes del adaptador

### Infraestructura de tests y cableado

- [ ] T014 Añadir el doble de `react-native-purchases` a `jest.setup.ts`, junto a los de `expo-maps` y `expo-sqlite`, con ayudantes para sembrar "esta cuenta ya compró", forzar fallo de red, forzar cancelación y empujar una revocación
- [ ] T015 Actualizar `src/core/entitlement/index.ts` para reexportar los módulos nuevos sin retirar `InMemoryEntitlementSource`, que sigue sirviendo a los tests de pantallas ajenos a la compra
- [ ] T016 Actualizar `src/ui/providers/EntitlementProvider.tsx`: `usePurchase()` pasa a devolver `Promise<PurchaseOutcome>`, se añaden `useRestore()` y `useStorePrice()`, y se serializan las acciones para que una segunda pulsación no abra una segunda hoja de compra
- [ ] T017 Actualizar `app/_layout.tsx` para componer `StoreBackedEntitlementSource` con el adaptador real y la caché, e invocar `hydrate()` al montar sin retrasar la aparición de la interfaz
- [ ] T018 Ejecutar `npm run verify` y corregir lo que el cableado haya roto en la suite existente; **la suite debe quedar verde antes de abrir ninguna historia**

**Checkpoint**: el dominio, el adaptador y el arranque están en su sitio; la app compra a través de la tienda falsa y nada de lo que ya funcionaba se ha roto

---

## Phase 3: User Story 1 - Desbloquear con una compra única (Priority: P1) 🎯 MVP

**Goal**: que una persona sin la compra pueda pagar una vez en la hoja nativa de la tienda y
ver desbloqueadas todas las localizaciones premium, sin reiniciar la app.

**Independent Test**: partiendo de caché vacía y tienda falsa sin compra previa, completar el
pago y comprobar que el contenido premium queda accesible de inmediato. No necesita nada de
US2 ni de US3.

### Tests for User Story 1 ⚠️

> Escribir primero y verlos fallar antes de implementar

- [ ] T019 [P] [US1] Unitarios de `purchase()` en `__tests__/core/entitlement-store-backed.test.ts`: `purchased` y `already-owned` conceden, persisten y notifican; `cancelled` no cambia nada ni registra error; `unavailable` no cambia nada y registra
- [ ] T020 [P] [US1] Aceptación de la compra en `__tests__/screens/purchase-flow.test.tsx`, escenarios 1–3 de [contracts/screens.md §6](./contracts/screens.md): desbloqueo tras comprar, no poder pagar dos veces, y cancelar sin mensaje de error
- [ ] T021 [P] [US1] Aceptación de la presentación del paywall en `__tests__/screens/paywall.test.tsx`, escenarios 10–11: el aviso de alcance por plataforma aparece antes del botón, y sin respuesta de ofertas no hay cifra y la compra queda desactivada

### Implementation for User Story 1

- [ ] T022 [US1] Implementar `purchase()` en `src/core/entitlement/store-backed.ts` según [contracts/core-api.md §3](./contracts/core-api.md), tratando `already-owned` como éxito
- [ ] T023 [US1] Sustituir el precio literal `9,99 €` de `app/paywall.tsx` por `useStorePrice()`, dejando la cifra ausente y el botón desactivado mientras no haya precio
- [ ] T024 [US1] Añadir a `app/paywall.tsx` el aviso de que el desbloqueo pertenece a la cuenta de tienda de esa plataforma, visible y por encima del botón de compra
- [ ] T025 [US1] Tratar en `app/paywall.tsx` los cinco desenlaces de compra con mensajes distinguibles, sin mostrar error alguno cuando la persona cancela

**Checkpoint**: la compra funciona de punta a punta y es demostrable por sí sola

---

## Phase 4: User Story 2 - Restaurar la compra en una instalación nueva (Priority: P1)

**Goal**: que quien ya pagó recupere su acceso en un dispositivo nuevo o tras reinstalar, sin
soporte de por medio. Al no haber cuentas, es el único mecanismo de recuperación.

**Independent Test**: con la caché vacía y la tienda falsa sembrada con una compra previa,
pulsar "Restaurar compra" y comprobar que el contenido premium queda accesible. No depende de
US1: no hace falta haber comprado en esta sesión.

### Tests for User Story 2 ⚠️

- [ ] T026 [P] [US2] Unitarios de `restore()` en `__tests__/core/entitlement-store-backed.test.ts`: `restored` concede y persiste; `nothing-to-restore` **revoca** si había titularidad, por ser una respuesta afirmativa de la tienda; `unavailable` no toca el estado
- [ ] T027 [P] [US2] Aceptación en `__tests__/screens/restore-purchase.test.tsx`, escenarios 4–6 de [contracts/screens.md §6](./contracts/screens.md): restaurar en instalación limpia, no haber nada que restaurar, y el caso de la otra plataforma con su mensaje explicativo

### Implementation for User Story 2

- [ ] T028 [US2] Implementar `restore()` en `src/core/entitlement/store-backed.ts`, distinguiendo `nothing-to-restore` de `unavailable`
- [ ] T029 [US2] Convertir la fila "Restaurar compra" de `app/(tabs)/profile.tsx` en control pulsable con `accessibilityRole="button"` y mensajes para los tres desenlaces, dejando "Descarga sin conexión" como fila informativa
- [ ] T030 [P] [US2] Añadir el control secundario "Restaurar compra" a `app/paywall.tsx`, bajo el botón de compra, con los mismos tres desenlaces

**Checkpoint**: comprar y restaurar funcionan y se validan por separado

---

## Phase 5: User Story 3 - Conservar el acceso sin confirmación de la tienda (Priority: P2)

**Goal**: que quien ya compró siga viendo su contenido cuando no hay red o la tienda falla, y
que una revocación real sí se refleje. Es la asimetría central de la feature: la tienda puede
conceder y revocar, pero su silencio nunca revoca.

**Independent Test**: sembrando la caché con `'1'` y dejando la tienda falsa muda, arrancar y
comprobar que el contenido premium sigue accesible. No requiere haber pasado por US1 ni US2.

### Tests for User Story 3 ⚠️

- [ ] T031 [P] [US3] Unitarios de `reconcile()` y `watch()` en `__tests__/core/entitlement-store-backed.test.ts`: una respuesta `known` manda y se persiste en ambos sentidos; `unavailable` no cambia nada, no escribe y no notifica; dos reconciliaciones iguales notifican una sola vez
- [ ] T032 [P] [US3] Aceptación en `__tests__/screens/entitlement-degradation.test.tsx`, escenarios 7–9 de [contracts/screens.md §6](./contracts/screens.md): arranque sin red conservando el acceso, reconciliación fallida que no revoca, y reembolso que sí vuelve a bloquear

### Implementation for User Story 3

- [ ] T033 [US3] Implementar `reconcile()` y `watch()` en `src/core/entitlement/store-backed.ts`, registrando los fallos por `ContentLogger` solo con el vocabulario `StoreFailure`
- [ ] T034 [US3] Enganchar en `app/_layout.tsx` la reconciliación al arrancar y en cada vuelta a primer plano vía `appStateLifecycle()`, más `watch()`, dando de baja ambas suscripciones al desmontar

**Checkpoint**: las cuatro situaciones de acceso que exige el principio III quedan cubiertas; la deuda de la feature 003 está saldada

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T035 Verificar sobre el `AndroidManifest.xml` generado tras `npx expo prebuild --clean` que `com.android.vending.BILLING` aparece por fusión de manifiestos; si no aparece, añadir un config plugin propio mínimo que lo declare (D-002)
- [ ] T036 [P] Revisar que ningún registro emitido por `src/platform/purchases/revenuecat.ts` incluya el error crudo del SDK, precios ni identificadores de transacción, sino solo `StoreFailure` (FR-012)
- [ ] T037 [P] Documentar en `README.md` que la app exige development build y configuración de RevenueCat, remitiendo a [quickstart.md §4](./quickstart.md) para los pasos de consola
- [ ] T038 Ejecutar `npm run verify` con todas las puertas en verde: tipos, lint, validación de catálogo y las dos suites de tests
- [ ] T039 Recorrer la validación manual en development build de [quickstart.md §2.2](./quickstart.md) en Android y en iOS
- [ ] T040 Completar la lista de validación contra tiendas reales de [quickstart.md §3](./quickstart.md) como puerta previa a publicar, incluido el reembolso desde consola para probar la revocación

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias
- **Foundational (Phase 2)**: depende de Setup — **bloquea las tres historias**
- **US1, US2, US3 (Phases 3–5)**: dependen solo de Foundational; entre ellas son independientes
- **Polish (Phase 6)**: depende de las historias que se quieran entregar

### User Story Dependencies

Las tres historias son **independientes en comportamiento**: cada una se puede implementar,
probar y demostrar sin las otras dos, porque cada una puede llevar la titularidad a su estado
de partida por su cuenta (US1 comprando, US2 restaurando, US3 sembrando la caché).

**Pero comparten dos ficheros**, y conviene saberlo antes de planificar:

| Fichero | Lo tocan |
|---------|----------|
| `src/core/entitlement/store-backed.ts` | T022 (US1), T028 (US2), T033 (US3) |
| `app/paywall.tsx` | T023–T025 (US1), T030 (US2) |
| `__tests__/core/entitlement-store-backed.test.ts` | T019 (US1), T026 (US2), T031 (US3) |

Son adiciones de métodos y de bloques `describe` independientes, no reescrituras, así que el
conflicto es de edición simultánea, no de diseño. En un proyecto de una sola persona —que es
el caso— esto es irrelevante: basta con ir en orden.

### Within Each User Story

- Los tests se escriben primero y deben fallar antes de implementar
- Núcleo antes que UI: el orquestador antes que la pantalla que lo consume
- Dentro de la UI, una pantalla completa antes de pasar a la siguiente

---

## Parallel Opportunities

**Phase 1**: T002 y T003 en paralelo (T001 primero, porque instala la dependencia).

**Phase 2**: el bloque de puertos es el más paralelizable de toda la feature — T004, T005,
T006 y T007 son cuatro ficheros nuevos sin relación entre sí. Después, T010, T012 y T013
también van sueltos. T008 → T009 → T011 → T014 → T015 → T016 → T017 → T018 son secuenciales.

**Dentro de cada historia**: todos los tests marcados `[P]` van a la vez, porque están en
ficheros distintos; la implementación posterior es secuencial por compartir fichero.

**Entre historias**: con más de una persona, US1, US2 y US3 pueden abrirse a la vez en cuanto
Foundational esté cerrada, coordinando las ediciones de los dos ficheros compartidos. Con una
sola persona, el orden P1 → P1 → P2 es el que entrega valor antes.

### Parallel Example: Phase 2, bloque de puertos

```bash
# Cuatro ficheros nuevos, ninguna dependencia entre ellos:
Task: "Crear src/core/entitlement/store-gateway.ts"
Task: "Crear src/core/entitlement/lifecycle.ts"
Task: "Crear src/core/entitlement/cache.ts"
Task: "Escribir __tests__/core/entitlement-cache.test.ts"
```

### Parallel Example: tests de User Story 1

```bash
Task: "Unitarios de purchase() en __tests__/core/entitlement-store-backed.test.ts"
Task: "Aceptación de compra en __tests__/screens/purchase-flow.test.tsx"
Task: "Aceptación del paywall en __tests__/screens/paywall.test.tsx"
```

---

## Implementation Strategy

### MVP (solo User Story 1)

1. Phase 1: Setup
2. Phase 2: Foundational — **crítica, bloquea todo**
3. Phase 3: US1
4. **PARAR Y VALIDAR**: comprar desbloquea, cancelar no rompe nada, el paywall muestra precio real y aviso de plataforma

El MVP es demostrable, pero **no publicable**: sin US2 nadie puede recuperar su compra tras
reinstalar, y al no haber cuentas eso no tiene ningún otro remedio. La constitución declara la
restauración funcionalidad crítica, así que US2 no es opcional para salir a tienda aunque sea
una historia separada.

### Entrega incremental

1. Setup + Foundational → cimiento listo, suite verde
2. + US1 → comprar funciona → demo
3. + US2 → **mínimo publicable**: comprar y recuperar
4. + US3 → la app aguanta la calle: sin red no pierde el acceso, y un reembolso sí se refleja
5. + Phase 6 → verificación del manifiesto, documentación y validación contra tiendas reales

### Orden recomendado para una sola persona

Secuencial, tal cual está numerado. Las dos historias P1 van seguidas porque juntas son lo
mínimo que se puede publicar; US3 después, porque es la que convierte la feature en algo que
funciona en un mirador de Madrid sin cobertura.

---

## Notes

- `[P]` = ficheros distintos, sin dependencias pendientes
- Commits `feat:` o `fix:` únicamente; el resto de tipos rompe el versionado semántico
- La enmienda de la constitución a v1.0.1 (autolinking en vez de config plugin) va en **su
  propio commit**, separada del producto, como exige el apartado de Enmiendas
- Ninguna tarea da una historia por cerrada sin sus tests en el mismo PR (principio III)
- Verificar que los tests fallan antes de implementar
- Parar en cualquier checkpoint para validar la historia por separado
