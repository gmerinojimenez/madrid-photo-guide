import type { Entitlement } from '../content/access.ts';
import type { EntitlementSource } from './source.ts';

/**
 * Implementación de sustitución de esta entrega (D-006). Arranca sin la compra y
 * expone `grant()`, que es lo que llama el botón "Comprar". No persiste nada: un
 * reinicio de la app vuelve siempre a `{ owned: false }` (FR-029).
 */
export class InMemoryEntitlementSource implements EntitlementSource {
  private entitlement: Entitlement;
  private listeners = new Set<(entitlement: Entitlement) => void>();

  constructor(initial: Entitlement = { owned: false }) {
    this.entitlement = initial;
  }

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

  /** Concede la titularidad y notifica. Idempotente: no vuelve a notificar si ya estaba concedida. */
  grant(): void {
    if (this.entitlement.owned) return;
    this.entitlement = { owned: true };
    for (const listener of this.listeners) listener(this.entitlement);
  }
}
