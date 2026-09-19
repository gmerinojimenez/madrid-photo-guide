import type { Catalog } from './schema.ts';

export type CatalogCounts = { total: number; free: number; premium: number };

/**
 * Recuentos derivados del catálogo cargado (FR-012, D-011). Es la única fuente de
 * los recuentos que se muestran a la persona usuaria: ninguna pantalla escribe una
 * cifra literal de localizaciones.
 *
 * Función pura: no lee estado global ni cachea. Como el esquema ya normaliza toda
 * marca ausente o ilegible a "premium", `free + premium === total` siempre.
 */
export function catalogCounts(catalog: Catalog): CatalogCounts {
  const total = catalog.locations.length;
  const free = catalog.locations.filter((location) => location.access === 'free').length;
  return { total, free, premium: total - free };
}
