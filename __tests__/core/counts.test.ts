import { describe, expect, it } from '@jest/globals';

import { catalogCounts } from '../../src/core/content/counts.ts';
import { loadCatalog } from '../../src/core/content/catalog.ts';
import rawCatalog from '../../src/content/catalog.json';
import type { Catalog } from '../../src/core/content/schema.ts';

function emptyCatalog(): Catalog {
  return {
    schemaVersion: 1,
    updatedAt: '2026-09-18',
    locales: ['es'],
    access: { premiumFields: [] },
    tags: [],
    tipCategories: [],
    neighbourhoods: [],
    locations: [],
    tips: [],
  };
}

describe('catalogCounts', () => {
  it('el invariante free + premium === total se cumple siempre', () => {
    const result = loadCatalog(rawCatalog);
    if (result.status !== 'ok') throw new Error('catalog did not load');
    const counts = catalogCounts(result.catalog);
    expect(counts.free + counts.premium).toBe(counts.total);
  });

  it('un catálogo sin localizaciones premium cuenta todo como gratis', () => {
    const catalog = emptyCatalog();
    catalog.locations = [
      {
        id: 'sol',
        name: { es: 'Puerta del Sol' },
        neighbourhoodId: 'centro',
        tagIds: [],
        access: 'free',
        approximateArea: { lat: 40.4169, lng: -3.7033, radiusMeters: 300 },
        thumbnail: { locationId: 'sol', usage: 'thumb', alt: { es: 'alt' } },
        coords: { lat: 40.4169, lng: -3.7033 },
        shotDescription: { es: 'desc' },
        detailImage: { locationId: 'sol', usage: 'detail', alt: { es: 'alt' } },
      },
    ];
    expect(catalogCounts(catalog)).toEqual({ total: 1, free: 1, premium: 0 });
  });

  it('un catálogo vacío cuenta cero en todo', () => {
    expect(catalogCounts(emptyCatalog())).toEqual({ total: 0, free: 0, premium: 0 });
  });
});
