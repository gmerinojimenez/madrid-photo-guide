import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Entitlement } from '../../core/content/access.ts';
import type { EntitlementSource } from '../../core/entitlement/source.ts';

const EntitlementValueContext = createContext<Entitlement | null>(null);
const PurchaseContext = createContext<(() => void) | null>(null);

/**
 * Envuelve una `EntitlementSource` del núcleo en un contexto de React (D-006):
 * la fuente es núcleo, la reactividad hacia la UI es de aquí. Un cambio de
 * titularidad repinta a la vez marcadores, barra de modo prueba, guardados,
 * perfil y fichas (FR-031).
 *
 * `onPurchase` es del llamador (hoy, `() => entitlementSource.grant()` en el
 * layout raíz), no del contexto: `EntitlementSource` no declara `grant()`
 * —es específico de `InMemoryEntitlementSource`— porque RevenueCat no lo
 * tendrá. Mantenerlo fuera de la interfaz evita filtrar ese detalle.
 */
export function EntitlementProvider({
  source,
  onPurchase,
  children,
}: {
  source: EntitlementSource;
  onPurchase: () => void;
  children: ReactNode;
}) {
  const [entitlement, setEntitlement] = useState<Entitlement>(() => source.current());

  useEffect(() => {
    return source.subscribe(setEntitlement);
  }, [source]);

  return (
    <PurchaseContext.Provider value={onPurchase}>
      <EntitlementValueContext.Provider value={entitlement}>
        {children}
      </EntitlementValueContext.Provider>
    </PurchaseContext.Provider>
  );
}

/** Titularidad vigente, reactiva a los cambios de la fuente. */
export function useEntitlement(): Entitlement {
  const value = useContext(EntitlementValueContext);
  if (value === null) {
    throw new Error('useEntitlement() debe usarse dentro de <EntitlementProvider>');
  }
  return value;
}

/** Acción de "Comprar" del paywall (FR-030). */
export function usePurchase(): () => void {
  const purchase = useContext(PurchaseContext);
  if (!purchase) {
    throw new Error('usePurchase() debe usarse dentro de <EntitlementProvider>');
  }
  return purchase;
}
