import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Entitlement } from '../../core/content/access.ts';
import type { EntitlementSource } from '../../core/entitlement/source.ts';

const EntitlementSourceContext = createContext<EntitlementSource | null>(null);
const EntitlementValueContext = createContext<Entitlement | null>(null);

/**
 * Envuelve una `EntitlementSource` del núcleo en un contexto de React (D-006):
 * la fuente es núcleo, la reactividad hacia la UI es de aquí. Un cambio de
 * titularidad repinta a la vez marcadores, barra de modo prueba, guardados,
 * perfil y fichas (FR-031).
 */
export function EntitlementProvider({
  source,
  children,
}: {
  source: EntitlementSource;
  children: ReactNode;
}) {
  const [entitlement, setEntitlement] = useState<Entitlement>(() => source.current());

  useEffect(() => {
    return source.subscribe(setEntitlement);
  }, [source]);

  return (
    <EntitlementSourceContext.Provider value={source}>
      <EntitlementValueContext.Provider value={entitlement}>
        {children}
      </EntitlementValueContext.Provider>
    </EntitlementSourceContext.Provider>
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

/** La fuente en sí, para quien necesita llamar a `grant()` (el paywall). */
export function useEntitlementSource(): EntitlementSource {
  const source = useContext(EntitlementSourceContext);
  if (!source) {
    throw new Error('useEntitlementSource() debe usarse dentro de <EntitlementProvider>');
  }
  return source;
}
