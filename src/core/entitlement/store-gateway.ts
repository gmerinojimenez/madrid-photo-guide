/**
 * Puerto de tienda (D-003, D-004, contracts/core-api.md §2.1): la implementa
 * `src/platform/purchases/revenuecat.ts`. Ningún método lanza — todo fallo es
 * un valor del tipo cerrado `StoreFailure`, nunca una excepción del SDK.
 */

export type StoreFailure = 'offline' | 'store' | 'not-allowed';

export type OwnershipQuery =
  { status: 'known'; owned: boolean } | { status: 'unavailable'; failure: StoreFailure };

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

  /**
   * Cambios que empuja la tienda por su cuenta (reembolso, compra en otro
   * dispositivo). Devuelve una función de baja idempotente.
   */
  observe(listener: (owned: boolean) => void): () => void;
}
