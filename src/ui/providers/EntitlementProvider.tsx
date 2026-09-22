import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { Entitlement } from '../../core/content/access.ts';
import type { EntitlementSource } from '../../core/entitlement/source.ts';
import type {
  PurchaseOutcome,
  RestoreOutcome,
  StorePrice,
} from '../../core/entitlement/store-gateway.ts';

type PurchaseFn = () => Promise<PurchaseOutcome>;
type RestoreFn = () => Promise<RestoreOutcome>;
type PriceFn = () => Promise<StorePrice>;

const EntitlementValueContext = createContext<Entitlement | null>(null);
const PurchaseContext = createContext<PurchaseFn | null>(null);
const RestoreContext = createContext<RestoreFn | null>(null);
const StorePriceContext = createContext<StorePrice>(null);

/**
 * Envuelve una `EntitlementSource` del núcleo en un contexto de React
 * (D-006, contracts/screens.md §2): la fuente es núcleo, la reactividad hacia
 * la UI es de aquí. Un cambio de titularidad repinta a la vez marcadores,
 * barra de modo prueba, guardados, perfil y fichas (FR-031).
 *
 * `onPurchase` y `onRestore` son del llamador (hoy, los métodos de
 * `StoreBackedEntitlementSource` compuestos en el layout raíz), no del
 * contexto: `EntitlementSource` no los declara —son específicos del
 * orquestador respaldado por la tienda— y mantenerlos fuera de la interfaz
 * evita filtrar ese detalle.
 *
 * Las acciones se serializan: mientras una compra o una restauración está en
 * curso, una segunda llamada al mismo tipo de acción devuelve el desenlace de
 * la primera en lugar de abrir una segunda hoja de compra.
 */
export function EntitlementProvider({
  source,
  onPurchase,
  onRestore,
  onFetchPrice,
  children,
}: {
  source: EntitlementSource;
  onPurchase: PurchaseFn;
  onRestore: RestoreFn;
  onFetchPrice: PriceFn;
  children: ReactNode;
}) {
  const [entitlement, setEntitlement] = useState<Entitlement>(() => source.current());
  const [price, setPrice] = useState<StorePrice>(null);

  useEffect(() => {
    return source.subscribe(setEntitlement);
  }, [source]);

  useEffect(() => {
    let cancelled = false;
    onFetchPrice().then((result) => {
      if (!cancelled) setPrice(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se consulta una sola vez al montar
  }, []);

  const purchaseInFlight = useRef<Promise<PurchaseOutcome> | null>(null);
  const purchase: PurchaseFn = () => {
    if (purchaseInFlight.current) return purchaseInFlight.current;
    const promise = onPurchase().finally(() => {
      purchaseInFlight.current = null;
    });
    purchaseInFlight.current = promise;
    return promise;
  };

  const restoreInFlight = useRef<Promise<RestoreOutcome> | null>(null);
  const restore: RestoreFn = () => {
    if (restoreInFlight.current) return restoreInFlight.current;
    const promise = onRestore().finally(() => {
      restoreInFlight.current = null;
    });
    restoreInFlight.current = promise;
    return promise;
  };

  return (
    <PurchaseContext.Provider value={purchase}>
      <RestoreContext.Provider value={restore}>
        <StorePriceContext.Provider value={price}>
          <EntitlementValueContext.Provider value={entitlement}>
            {children}
          </EntitlementValueContext.Provider>
        </StorePriceContext.Provider>
      </RestoreContext.Provider>
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

/** Acción de "Comprar" del paywall (FR-030): asíncrona, devuelve el desenlace. */
export function usePurchase(): PurchaseFn {
  const purchase = useContext(PurchaseContext);
  if (!purchase) {
    throw new Error('usePurchase() debe usarse dentro de <EntitlementProvider>');
  }
  return purchase;
}

/** Acción de "Restaurar compra" del paywall y del perfil (D-011). */
export function useRestore(): RestoreFn {
  const restore = useContext(RestoreContext);
  if (!restore) {
    throw new Error('useRestore() debe usarse dentro de <EntitlementProvider>');
  }
  return restore;
}

/** Precio localizado del paywall (D-008). `null` mientras carga o si falla. */
export function useStorePrice(): StorePrice {
  return useContext(StorePriceContext);
}
