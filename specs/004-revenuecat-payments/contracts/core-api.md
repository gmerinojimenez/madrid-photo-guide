# Contrato — API del núcleo: titularidad de compra

**Feature**: `004-revenuecat-payments`

Todo lo de este documento es **TypeScript puro**: sin `react`, sin `react-native`, sin
`expo-*`, ejecutable en Node. La batería `__tests__/core/purity.test.ts` lo verifica en CI.

---

## 1. Lo que ya existe y se conserva

```ts
// src/core/content/access.ts — SIN CAMBIOS
export type Entitlement = { owned: boolean };
export function viewLocation(l: Location, e: Entitlement): Location | LocationPreview;

// src/core/entitlement/source.ts — SIN CAMBIOS
export interface EntitlementSource {
  current(): Entitlement;
  subscribe(listener: (entitlement: Entitlement) => void): () => void;
}
```

`InMemoryEntitlementSource` **se mantiene** tal cual: es el doble que usan los tests de
pantallas que no versan sobre la compra, y seguir teniéndolo evita que cada test de UI
tenga que levantar una tienda falsa.

---

## 2. Puertos nuevos (los implementa `src/platform/`)

### 2.1 `StoreGateway`

La tienda vista por el dominio. **Ningún método lanza**: todo fallo se devuelve como valor.

```ts
// src/core/entitlement/store-gateway.ts

export type StoreFailure = 'offline' | 'store' | 'not-allowed';

export type OwnershipQuery =
  | { status: 'known'; owned: boolean }
  | { status: 'unavailable'; failure: StoreFailure };

export type PurchaseOutcome =
  | { status: 'purchased' }
  | { status: 'already-owned' }
  | { status: 'cancelled' }
  | { status: 'unavailable'; failure: StoreFailure };

export type RestoreOutcome =
  | { status: 'restored' }
  | { status: 'nothing-to-restore' }
  | { status: 'unavailable'; failure: StoreFailure };

/** Precio tal y como lo da la tienda. `null` = no se ha podido consultar (D-008). */
export type StorePrice = { formatted: string } | null;

export interface StoreGateway {
  /** ¿Tiene la titularidad? Nunca lanza. */
  ownership(): Promise<OwnershipQuery>;

  /** Abre la hoja de compra nativa y espera al desenlace. Nunca lanza. */
  purchase(): Promise<PurchaseOutcome>;

  /** Pide a la tienda las compras de esta cuenta. Nunca lanza. */
  restore(): Promise<RestoreOutcome>;

  /** Precio localizado para el paywall. Nunca lanza. */
  price(): Promise<StorePrice>;

  /** Cambios que empuja la tienda por su cuenta (reembolso, compra en otro dispositivo). */
  observe(listener: (owned: boolean) => void): () => void;
}
```

**Contrato de `observe`**: devuelve una función de baja idempotente — llamarla dos veces no
falla. El adaptador de RevenueCat la construye sobre
`removeCustomerInfoUpdateListener`, que no devuelve función de baja por sí mismo (D-003).

### 2.2 `EntitlementCache`

```ts
// src/core/entitlement/cache.ts

export interface EntitlementCache {
  /** `null` = nunca se ha sabido. Nunca lanza. */
  read(): Promise<boolean | null>;
  /** Nunca lanza: un fallo de escritura se registra y se descarta. */
  write(owned: boolean): Promise<void>;
}

/**
 * Implementación sobre el puerto `PreferencesStore` que ya existe (D-005).
 * Vive en el núcleo porque `PreferencesStore` también es del núcleo: no toca
 * SQLite, solo la interfaz.
 */
export function preferencesEntitlementCache(prefs: PreferencesStore): EntitlementCache;
```

Regla de lectura: `'1'` → `true`; **cualquier otro valor presente** → `false`; ausente →
`null`. Un valor corrupto nunca concede acceso.

### 2.3 `AppLifecycle`

```ts
// src/core/entitlement/lifecycle.ts

export interface AppLifecycle {
  /** Notifica cada vuelta a primer plano. Devuelve la baja. */
  onForeground(listener: () => void): () => void;
}
```

Interfaz de un solo método, colocada junto a la titularidad porque es su único consumidor.
El adaptador sobre `AppState` de React Native vive en `src/platform/system/`.

---

## 3. El orquestador: `StoreBackedEntitlementSource`

El corazón de la feature. Implementa `EntitlementSource`, así que **la UI que ya existe lo
consume sin enterarse de que ha cambiado nada**.

```ts
// src/core/entitlement/store-backed.ts

export class StoreBackedEntitlementSource implements EntitlementSource {
  constructor(
    gateway: StoreGateway,
    cache: EntitlementCache,
    logger?: ContentLogger,
  );

  // --- EntitlementSource (sin cambios de firma) ---
  current(): Entitlement;
  subscribe(listener: (entitlement: Entitlement) => void): () => void;

  // --- Ciclo de vida ---
  /** Publica el valor de la caché. Se llama una vez al arrancar. */
  hydrate(): Promise<void>;
  /** Pregunta a la tienda. Si responde, manda ella y se persiste. */
  reconcile(): Promise<void>;
  /** Suscribe las notificaciones empujadas por la tienda. Devuelve la baja. */
  watch(): () => void;

  // --- Acciones del usuario ---
  purchase(): Promise<PurchaseOutcome>;
  restore(): Promise<RestoreOutcome>;
}
```

### Comportamiento exigible (cada viñeta, un test)

**`current()`**
- Síncrono y siempre disponible. Antes de `hydrate()` devuelve `{ owned: false }`.

**`hydrate()`**
- `'1'` → `{ owned: true }`; `'0'` o ausente → `{ owned: false }`.
- No consulta a la tienda. No escribe la caché.
- Notifica solo si el valor difiere del vigente.

**`reconcile()`**
- `{ status: 'known', owned }` → adopta ese valor, lo persiste y notifica si cambió.
  Vale tanto para conceder como para **revocar** (FR-011).
- `{ status: 'unavailable' }` → **no cambia nada**, no escribe caché, no notifica; registra
  el fallo por `ContentLogger` (FR-007).
- Invocable en cualquier momento y cuantas veces haga falta; dos llamadas seguidas con la
  misma respuesta notifican una sola vez.

**`purchase()`**
- `purchased` y `already-owned` → `{ owned: true }`, persistido y notificado.
- `cancelled` → estado intacto, sin escritura, sin notificación, sin registro de error.
- `unavailable` → estado intacto; se registra.
- Devuelve siempre el desenlace al llamador para que elija el mensaje.

**`restore()`**
- `restored` → `{ owned: true }`, persistido y notificado.
- `nothing-to-restore` → la tienda respondió: si el estado vigente era `true`, **se revoca**
  y se persiste, porque es una respuesta afirmativa de que no hay titularidad.
- `unavailable` → estado intacto.

**`watch()`**
- Cada notificación empujada se trata como una reconciliación con respuesta: la tienda
  manda, se persiste, se notifica si cambió.

**Invariantes transversales**
- Ningún método rechaza su promesa.
- Ningún método revoca sin respuesta afirmativa de la tienda.
- `subscribe` nunca emite dos veces el mismo valor consecutivo.

---

## 4. Composición (dónde se ata todo)

```ts
// src/platform/purchases/revenuecat.ts
export function createRevenueCatGateway(config: RevenueCatConfig): StoreGateway;

// src/platform/purchases/config.ts
export type RevenueCatConfig = {
  apiKey: string | null;      // null ⇒ gateway que degrada a 'store' en todo
  entitlementId: string;
};
export function readRevenueCatConfig(): RevenueCatConfig;  // expo-constants

// src/platform/system/app-lifecycle.ts
export function appStateLifecycle(): AppLifecycle;         // AppState de react-native
```

El layout raíz (`app/_layout.tsx`) sustituye la instancia en memoria por la real y engancha
hidratación, reconciliación y vigilancia. Es el único sitio donde se compone.

---

## 5. Reglas de dependencia

| Capa | Puede importar | Le está prohibido |
|------|----------------|-------------------|
| `src/core/entitlement/` | Solo otros módulos de `src/core/` | `react`, `react-native`, `expo-*`, `react-native-purchases` |
| `src/platform/purchases/` | `react-native-purchases`, `expo-constants`, puertos de `src/core/` | Componentes de React, `src/ui/` |
| `src/ui/providers/` | `react`, puertos de `src/core/` | `react-native-purchases` |
| `app/` | `src/ui/`, `src/core/` | `react-native-purchases` |

`__tests__/core/purity.test.ts` **se amplía** con un caso nuevo: nadie fuera de
`src/platform/purchases/` importa `react-native-purchases`. Es la garantía mecánica de que
sustituir de proveedor no obliga a tocar reglas de negocio.
