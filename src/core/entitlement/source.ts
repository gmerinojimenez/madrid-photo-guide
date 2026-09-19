import type { Entitlement } from '../content/access.ts';

/**
 * Fuente de titularidad (D-006). Es la interfaz que implementará RevenueCat en la
 * feature de pagos; se define ahora para que esa sustitución no toque ninguna
 * pantalla.
 */
export interface EntitlementSource {
  /** Titularidad vigente. Nunca lanza: ante duda, el estado conocido. */
  current(): Entitlement;

  /** Notifica cada cambio. Devuelve la función para dejar de escuchar. */
  subscribe(listener: (entitlement: Entitlement) => void): () => void;
}
