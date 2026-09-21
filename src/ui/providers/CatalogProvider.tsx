import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { loadCatalog, type Catalog } from '../../core/content/index.ts';
import rawCatalog from '../../content/catalog.json';
import { consoleLogger } from '../../platform/system/console-logger.ts';

export type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'error'; reason: string };

const CatalogContext = createContext<CatalogState>({ status: 'loading' });

/**
 * Carga y valida el catálogo empaquetado una sola vez (feature 002). El JSON
 * viene con la app, así que la carga es síncrona: el estado de carga existe por
 * uniformidad con el resto de proveedores, no porque tarde.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const state = useMemo<CatalogState>(() => {
    const result = loadCatalog(rawCatalog, consoleLogger);
    if (result.status === 'ok' || result.status === 'partial') {
      return { status: 'ready', catalog: result.catalog };
    }
    return { status: 'error', reason: result.status };
  }, []);

  return <CatalogContext.Provider value={state}>{children}</CatalogContext.Provider>;
}

export function useCatalogState(): CatalogState {
  return useContext(CatalogContext);
}

/** Acceso directo al catálogo ya cargado. Lanza si se usa antes de que esté listo. */
export function useCatalog(): Catalog {
  const state = useCatalogState();
  if (state.status !== 'ready') {
    throw new Error('useCatalog() solo puede usarse cuando el catálogo está listo');
  }
  return state.catalog;
}
