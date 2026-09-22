import type { Entitlement } from '../content/access.ts';
import type { ContentLogger } from '../content/logging.ts';
import type { EntitlementCache } from './cache.ts';
import type { EntitlementSource } from './source.ts';
import type { PurchaseOutcome, RestoreOutcome, StoreGateway } from './store-gateway.ts';

/**
 * Orquestador de titularidad respaldado por la tienda (contracts/core-api.md
 * §3). Implementa `EntitlementSource`, así que la UI que ya existe lo
 * consume sin enterarse de que ha cambiado nada (D-006).
 *
 * La decisión que gobierna todo el fichero: una respuesta afirmativa de la
 * tienda manda —conceder o revocar—, pero su silencio nunca revoca (D-007).
 */
export class StoreBackedEntitlementSource implements EntitlementSource {
  private entitlement: Entitlement = { owned: false };
  private listeners = new Set<(entitlement: Entitlement) => void>();

  constructor(
    private readonly gateway: StoreGateway,
    private readonly cache: EntitlementCache,
    private readonly logger?: ContentLogger,
  ) {}

  current(): Entitlement {
    return this.entitlement;
  }

  subscribe(listener: (entitlement: Entitlement) => void): () => void {
    this.listeners.add(listener);
    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      this.listeners.delete(listener);
    };
  }

  private adopt(owned: boolean): void {
    if (this.entitlement.owned === owned) return;
    this.entitlement = { owned };
    for (const listener of this.listeners) listener(this.entitlement);
  }

  private reportFailure(operation: string, failure: string): void {
    this.logger?.discarded({ collection: 'entitlement', id: operation, reason: failure });
  }

  /**
   * Publica el valor de la caché. Se llama una vez al arrancar. No consulta a
   * la tienda ni escribe nada.
   */
  async hydrate(): Promise<void> {
    const cached = await this.cache.read();
    this.adopt(cached === true);
  }

  /**
   * Pregunta a la tienda. Si responde, manda ella y se persiste — tanto para
   * conceder como para revocar (FR-008, FR-011). Si no responde, no cambia
   * nada, no escribe caché y no notifica; registra el fallo.
   */
  async reconcile(): Promise<void> {
    const query = await this.gateway.ownership();
    if (query.status === 'unavailable') {
      this.reportFailure('reconcile', query.failure);
      return;
    }
    this.adopt(query.owned);
    await this.cache.write(query.owned);
  }

  /** Suscribe las notificaciones empujadas por la tienda. Devuelve la baja. */
  watch(): () => void {
    return this.gateway.observe((owned) => {
      this.adopt(owned);
      void this.cache.write(owned);
    });
  }

  async purchase(): Promise<PurchaseOutcome> {
    const outcome = await this.gateway.purchase();
    if (outcome.status === 'purchased' || outcome.status === 'already-owned') {
      this.adopt(true);
      await this.cache.write(true);
    } else if (outcome.status === 'unavailable') {
      this.reportFailure('purchase', outcome.failure);
    }
    return outcome;
  }

  async restore(): Promise<RestoreOutcome> {
    const outcome = await this.gateway.restore();
    if (outcome.status === 'restored') {
      this.adopt(true);
      await this.cache.write(true);
    } else if (outcome.status === 'nothing-to-restore') {
      this.adopt(false);
      await this.cache.write(false);
    } else {
      this.reportFailure('restore', outcome.failure);
    }
    return outcome;
  }
}
