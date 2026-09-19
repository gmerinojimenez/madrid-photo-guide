import { describe, expect, it } from '@jest/globals';

import { queryLocations } from '../../src/core/content/query.ts';
import type { Catalog } from '../../src/core/content/schema.ts';

function catalogWith(overrides: Partial<Catalog>): Catalog {
  return {
    schemaVersion: 1,
    updatedAt: '2026-09-18',
    locales: ['es'],
    access: { premiumFields: [] },
    tags: [
      { id: 'callejera', label: { es: 'Callejera' } },
      { id: 'nocturna', label: { es: 'Nocturna' } },
    ],
    tipCategories: [{ id: 'ver', label: { es: 'Ver' } }],
    neighbourhoods: [{ id: 'arguelles', name: { es: 'Argüelles' } }],
    locations: [],
    tips: [],
    ...overrides,
  };
}

function locationFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'debod',
    name: { es: 'Templo de Debod' },
    neighbourhoodId: 'arguelles',
    tagIds: ['callejera', 'nocturna'],
    access: 'free' as const,
    approximateArea: { lat: 40.424, lng: -3.7177, radiusMeters: 400 },
    thumbnail: { locationId: 'debod', usage: 'thumb' as const, alt: { es: 'alt' } },
    coords: { lat: 40.424, lng: -3.7177 },
    shotDescription: { es: 'desc' },
    detailImage: { locationId: 'debod', usage: 'detail' as const, alt: { es: 'alt' } },
    ...overrides,
  };
}

describe('queryLocations', () => {
  it('una localización con dos etiquetas aparece bajo el filtro de ambas', () => {
    const catalog = catalogWith({ locations: [locationFixture()] });
    expect(queryLocations(catalog, { tagId: 'callejera' })).toHaveLength(1);
    expect(queryLocations(catalog, { tagId: 'nocturna' })).toHaveLength(1);
  });

  it('la búsqueda de "arguelles" encuentra "Argüelles"', () => {
    const catalog = catalogWith({ locations: [locationFixture()] });
    expect(queryLocations(catalog, { text: 'arguelles' })).toHaveLength(1);
  });

  it('una etiqueta fuera del vocabulario no excluye la localización de las demás consultas', () => {
    const catalog = catalogWith({
      locations: [locationFixture({ tagIds: ['inventada', 'callejera'] })],
    });
    expect(queryLocations(catalog, { tagId: 'callejera' })).toHaveLength(1);
    expect(queryLocations(catalog, {})).toHaveLength(1);
  });
});
