# Implementation Plan: Compra única y desbloqueo de contenido premium

**Branch**: `004-revenuecat-payments` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-revenuecat-payments/spec.md`

## Summary

Sustituir la titularidad simulada que dejó la feature 003 por la real: una compra única, no
consumible, cobrada por Google Play y la App Store a través de **RevenueCat**, con
restauración, reconciliación al arrancar y al volver a primer plano, y conservación del
acceso cuando la tienda no responde.

El enfoque se apoya en que **la frontera ya estaba puesta**. La feature 003 definió
`EntitlementSource` precisamente para esto y dejó escrito en su propio plan que la deuda se
cubriría aquí. Por eso esta feature es, en buena medida, un relleno de huecos previstos:

- `Entitlement = { owned: boolean }` **no cambia**, y con él no cambian `viewLocation`,
  `access.ts`, ni ninguna de las pantallas que deciden qué mostrar (D-006). Una feature de
  pagos que no necesita tocar el módulo de control de acceso es la señal de que ese módulo
  estaba bien aislado.
- La lógica de verdad —qué pasa cuando la tienda dice que sí, que no, o no dice nada— es
  **TypeScript puro** en `src/core/entitlement/`, probable en Node sin simulador y sin
  dobles nativos.
- `react-native-purchases` queda confinado a `src/platform/purchases/`, y un test de pureza
  en CI impide que se filtre a cualquier otro sitio.

La decisión de diseño que gobierna todo lo demás: **"la tienda dice que no" y "la tienda no
responde" son sucesos distintos**. El primero revoca; el segundo no toca nada. Confundirlos
es el bug que deja sin contenido a alguien que ha pagado, y el modelo de datos los separa
desde el tipo.

Las decisiones técnicas, con sus alternativas descartadas y las capacidades del SDK
verificadas contra el paquete publicado, están en [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript `~6.0.3` en modo `strict`, sobre Expo SDK 57 / React Native
0.86.3 (heredado de las features 001–003).

**Primary Dependencies**: una sola dependencia nueva,
**`react-native-purchases@10.10.1`** (publicada el 2026-09-21; peer `react-native >= 0.73.0`,
satisfecho de sobra). Se descarta `react-native-purchases-ui`: la app ya tiene su paywall.
`expo-constants` (lectura de claves) y `AppState` de React Native (vuelta a primer plano) ya
están en el proyecto. Verificación por paquete en
[research.md](./research.md#d-001--dependencia-react-native-purchases10101-y-nada-más).

**Storage**: la titularidad se cachea como **una clave** (`entitlement.owned`) en la tabla
`preferences` que ya existe, tras el puerto `PreferencesStore` del núcleo. **Sin migración
de esquema**: `PRAGMA user_version` se queda en 1 (D-005). No se persiste ningún recibo,
transacción ni dato de pago.

**Testing**: Jest con preset `jest-expo`. La máquina de estados completa se prueba en Node
contra un `StoreGateway` falso, sin tocar nada nativo; los once escenarios de pantalla, con
`renderRouter` y un doble de `react-native-purchases` añadido a `jest.setup.ts` junto a los
de `expo-maps` y `expo-sqlite` (D-010).

**Target Platform**: Android e iOS, en **development build**. La restricción no es nueva:
`expo-maps` y `expo-sqlite` ya impedían Expo Go. Sin bifurcaciones de plataforma en el
código; la única diferencia es qué clave pública se usa y qué hoja de compra abre el sistema.

**Project Type**: aplicación móvil multiplataforma, sin servidor propio.

**Performance Goals**: ni la hidratación ni la reconciliación retrasan la aparición de la
interfaz — la app arranca con el último estado conocido y se corrige sola. La compra, de
pulsar a ver el contenido desbloqueado, por debajo de 30 s con red normal (SC-001), dominado
por la hoja nativa de la tienda.

**Constraints**: sin servidor propio; validación del recibo **fuera del cliente**; la app
nunca ve datos de tarjeta; arranque y uso sin conectividad conservando el acceso ya
concedido; un único punto de decisión de acceso; ninguna importación del SDK fuera de su
adaptador.

**Scale/Scope**: 1 producto, 1 entitlement, 2 pantallas modificadas, 1 proveedor de React
modificado, 3 módulos nuevos de núcleo, 2 adaptadores nuevos de plataforma, 12 requisitos
funcionales, 3 historias de usuario.

## Constitution Check

*GATE: comprobado antes de Phase 0 y de nuevo tras el diseño de Phase 1.*

| Principio | Cómo lo cumple este plan | Estado |
|-----------|--------------------------|--------|
| **I. Núcleo compartido en TypeScript puro** | Los tres módulos nuevos de dominio (`store-gateway.ts`, `cache.ts`, `store-backed.ts`) son TypeScript puro y se ejecutan en Node. El SDK vive solo en `src/platform/purchases/`, y `purity.test.ts` gana un caso que lo verifica en CI: nadie más importa `react-native-purchases`. | ✅ |
| **II. Serverless y cliente-primero** | Cero servidores. RevenueCat es el **segundo y último** servicio gestionado, que la constitución ya autoriza nominalmente y acota a titularidad de compra. No se usa como analítica (principio IV). La app conserva el acceso sin red. | ✅ |
| **III. Testing por feature** | Se cubren por primera vez **las cuatro situaciones que el principio exige**: sin compra, con compra, restauración en instalación limpia, y estado indeterminable por fallo de red o tienda. Con ello **se salda la deuda** que la feature 003 registró en su Complexity Tracking. Unitarios en Node para toda la máquina de estados; once escenarios de aceptación en pantalla. | ✅ |
| **IV. Firebase como plano de observabilidad** | No se añade ningún SDK de analítica ni de errores. Los fallos de tienda se registran por el `ContentLogger` del núcleo, listo para Crashlytics, y solo con el vocabulario cerrado `StoreFailure` — nunca el error crudo del SDK, que lleva detalle de transacción (FR-012). Sigue sin haber Remote Config, así que la feature no se entrega tras un flag. | ⚠️ ver Complexity Tracking |
| **V. Paridad funcional con UX nativa** | Mismas capacidades, mismos textos y mismas reglas en ambas plataformas; el mismo contenido es gratuito y el mismo es de pago. Cero bifurcaciones de plataforma en el código. La limitación de que el desbloqueo no cruza de plataforma es de las tiendas, la reconoce la propia constitución, y se comunica antes de comprar (FR-009, D-012) en lugar de introducirse en silencio. | ✅ |
| **VI. Freemium de compra única** | Un producto no consumible, sin cuentas, sin suscripciones, sin fragmentar. Pago delegado íntegro en la hoja nativa. Validación del recibo en el servidor de RevenueCat: la app pregunta por la titularidad y **no reinterpreta el recibo**. Restauración en dos puntos de entrada. Degradación segura por diseño de tipos. La decisión de acceso sigue en un único módulo, que esta feature **no toca**. | ✅ |
| **Restricciones tecnológicas** | Una dependencia nueva, justificada y verificada. `strict` sin `any` ni `@ts-ignore`. Sin editar `ios/` ni `android/` a mano. Claves **públicas** en el bundle, como la constitución autoriza; ninguna clave secreta. La afirmación de que RevenueCat se integra «con su config plugin» era falsa (D-002) y **se ha corregido en la constitución v1.0.1**, que ahora prescribe autolinking. | ✅ |
| **Flujo y puertas de calidad** | Spec → plan → tasks antes de implementar. Puertas de CI intactas y obligatorias. Commits `feat:` / `fix:`. La spec declara la feature como el mecanismo mismo del modelo de pago, y la prueba manual de publicación en ambas tiendas está detallada en [quickstart.md](./quickstart.md#3-lo-que-solo-se-valida-contra-las-tiendas-reales). | ✅ |

**Resultado del gate (pre-Phase 0)**: pasa, con dos desviaciones registradas (la del config
plugin y la de Remote Config).

**Resultado del gate (post-Phase 1)**: pasa, y con **una sola** desviación viva. El diseño de
[data-model.md](./data-model.md) y [contracts/](./contracts/) no añadió dependencias,
servicios ni bifurcaciones más allá de las declaradas, no modificó el módulo único de
decisión de acceso, y no introdujo ninguna persistencia de datos de pago.

Dos deudas se cierran en este ciclo:

- **La desviación del config plugin desaparece**: no se justifica, se elimina. La
  constitución se ha corregido a **v1.0.1** (enmienda PATCH), y su restricción de
  Facturación ahora describe el mecanismo real —autolinking— en lugar de un config plugin
  inexistente. El plan ya no incumple nada en ese punto.
- **La cobertura de las cuatro situaciones de acceso del principio III**, que la feature 003
  dejó a medias, queda saldada aquí.

Queda viva únicamente la desviación de Remote Config, heredada de la feature 003 y sin
crecer.

## Project Structure

### Documentation (this feature)

```text
specs/004-revenuecat-payments/
├── plan.md              # Este fichero
├── research.md          # Phase 0: decisiones técnicas (D-001 … D-012)
├── data-model.md        # Phase 1: entidades, máquina de estados, persistencia
├── quickstart.md        # Phase 1: cómo validar, en tres niveles
├── contracts/           # Phase 1
│   ├── core-api.md      #   puertos y orquestador del núcleo
│   └── screens.md       #   pantallas, desenlaces y escenarios de aceptación
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — no lo crea /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── _layout.tsx                        # MODIFICADO: compone la fuente real,
│                                      #   hidrata, reconcilia y vigila
├── paywall.tsx                        # MODIFICADO: compra real, precio de tienda,
│                                      #   aviso de plataforma, restaurar
└── (tabs)/profile.tsx                 # MODIFICADO: "Restaurar compra" pasa a control

src/
├── core/                              # TypeScript puro, sin React ni nativo
│   ├── content/access.ts              # SIN CAMBIOS — la decisión de acceso no se toca
│   ├── storage/ports.ts               # SIN CAMBIOS — se reutiliza PreferencesStore
│   └── entitlement/
│       ├── source.ts                  # SIN CAMBIOS — el puerto ya estaba bien
│       ├── in-memory.ts               # SIN CAMBIOS — sigue sirviendo a los tests de UI
│       ├── store-gateway.ts           # NUEVO: puerto de tienda + tipos de desenlace
│       ├── cache.ts                   # NUEVO: caché sobre PreferencesStore
│       ├── lifecycle.ts               # NUEVO: puerto de vuelta a primer plano
│       ├── store-backed.ts            # NUEVO: el orquestador (máquina de estados)
│       └── index.ts                   # MODIFICADO: reexportes
├── platform/                          # adaptadores: aquí sí entra lo nativo
│   ├── purchases/                     # NUEVO — único lugar que importa el SDK
│   │   ├── revenuecat.ts              #   StoreGateway sobre react-native-purchases
│   │   ├── config.ts                  #   claves desde expo-constants
│   │   └── index.ts
│   └── system/
│       └── app-lifecycle.ts           # NUEVO: AppLifecycle sobre AppState
└── ui/providers/
    └── EntitlementProvider.tsx        # MODIFICADO: acciones asíncronas con desenlace,
                                       #   useRestore() y useStorePrice()

app.json                               # MODIFICADO: expo.extra.revenuecat (D-009)
jest.setup.ts                          # MODIFICADO: doble de react-native-purchases

__tests__/
├── core/
│   ├── entitlement.test.ts            # MODIFICADO: se mantiene lo de InMemory…
│   ├── entitlement-store-backed.test.ts  # NUEVO: la máquina de estados entera
│   ├── entitlement-cache.test.ts      # NUEVO: lectura, escritura y degradación
│   └── purity.test.ts                 # MODIFICADO: nadie importa el SDK fuera de su adaptador
└── screens/
    ├── purchase-flow.test.tsx         # MODIFICADO: compra contra la tienda falsa
    ├── restore-purchase.test.tsx      # NUEVO: US2 (restaurar, nada que restaurar, otra plataforma)
    └── entitlement-degradation.test.tsx  # NUEVO: US3 (sin red, fallo, reembolso)
```

**Structure Decision**: se mantiene la separación en tres capas de las features anteriores y
esta feature la pone a prueba de la manera más exigente posible — introduciendo un SDK
propietario de terceros. El reparto resultante es el argumento de que la separación
funciona: **toda la lógica de negocio de los pagos cae en `src/core/`**, donde se prueba en
Node en milisegundos, y `src/platform/purchases/` queda como una capa de traducción sin
decisiones propias —mapea códigos de error a un vocabulario del dominio y poco más.

El directorio `src/platform/purchases/` es nuevo, en lugar de colgar de `src/platform/system/`,
porque el test de pureza necesita una frontera nombrable: "solo este directorio importa
`react-native-purchases`" es una regla verificable en CI.

## Complexity Tracking

| Violación | Por qué es necesaria | Alternativa más simple, y por qué se rechaza |
|-----------|---------------------|---------------------------------------------|
| **Principio IV: la feature no se entrega tras un flag de Remote Config** con valor por defecto seguro. | Firebase sigue sin estar integrado: no hay Remote Config al que pedirle el flag. Y en esta feature en concreto, un flag sería además de dudoso sentido: apagar los pagos solo puede dejar la app o regalada o inservible, y la propia constitución prohíbe usar OTA para alterar el modelo de compra. La desviación es **la misma que registró la feature 003**, no una nueva. | Integrar Firebase aquí para poder poner el flag: metería un SDK nativo, configuración por plataforma y una feature entera de observabilidad dentro de una feature de pagos. Se mantiene como deuda **a cubrir en la feature de observabilidad**, que es la que introduce Remote Config. |

**Deudas saldadas por esta feature**

- **La desviación del config plugin ya no existe.** No se justificó: se corrigió el texto.
  La constitución afirmaba que RevenueCat se integra «con su config plugin»; el paquete
  publicado no contiene ninguno (D-002). La **enmienda PATCH a v1.0.1** ya está aplicada y
  la restricción de Facturación describe ahora el mecanismo real. Escribir un config plugin
  propio solo para obedecer la letra del texto habría sido código sin función —justo la
  complejidad que la constitución obliga a justificar—, así que se arregló el documento en
  lugar del código. La implementación sigue **verificando el manifiesto generado** tras el
  primer prebuild, que es la comprobación que convierte el hallazgo en algo falsable.
- **Las cuatro situaciones de acceso del principio III quedan cubiertas.** La feature 003
  registró que dos de ellas —restauración en instalación limpia y estado indeterminable— no
  podían probarse porque el comportamiento aún no existía. Existe ahora, y lo cubren los
  escenarios 4 a 9 de
  [contracts/screens.md §6](./contracts/screens.md#6-escenarios-de-aceptación--test).
