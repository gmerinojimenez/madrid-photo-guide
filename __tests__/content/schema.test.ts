import { describe, expect, it } from '@jest/globals';

import { loadCatalog, SUPPORTED_SCHEMA_VERSION } from '../../src/core/content/catalog';

function baseCatalog() {
  return {
    schemaVersion: 1,
    updatedAt: '2026-09-18',
    locales: ['es'],
    access: {
      premiumFields: [
        'coords',
        'capture',
        'shotDescription',
        'neighbourhoodDescription',
        'detailImage',
      ],
    },
    tags: [{ id: 'skyline', label: { es: 'Skyline' } }],
    tipCategories: [{ id: 'ver', label: { es: 'Ver' } }],
    neighbourhoods: [{ id: 'centro', name: { es: 'Centro' } }],
    locations: [
      {
        id: 'sol',
        name: { es: 'Puerta del Sol' },
        neighbourhoodId: 'centro',
        tagIds: ['skyline'],
        access: 'free',
        approximateArea: { lat: 40.4169, lng: -3.7033, radiusMeters: 300 },
        thumbnail: {
          locationId: 'sol',
          usage: 'thumb',
          alt: { es: 'La Puerta del Sol' },
        },
        coords: { lat: 40.4169, lng: -3.7033 },
        shotDescription: { es: 'Desde el centro de la plaza.' },
        detailImage: {
          locationId: 'sol',
          usage: 'detail',
          alt: { es: 'La Puerta del Sol en detalle' },
        },
      },
    ],
    tips: [],
  };
}

describe('loadCatalog — degradación elegante', () => {
  it('ignora campos desconocidos en cualquier nivel (FR-034)', () => {
    const raw = baseCatalog() as Record<string, unknown>;
    raw.unknownRootField = 'sorpresa';
    (raw.locations as Record<string, unknown>[])[0].unknownField = 'sorpresa';
    const result = loadCatalog(raw);
    expect(result.status).toBe('ok');
  });

  it('descarta en solitario una localización inválida conservando el resto (FR-035)', () => {
    const raw = baseCatalog();
    const broken = { ...raw.locations[0], id: 'broken', name: undefined };
    raw.locations.push(broken as unknown as (typeof raw.locations)[number]);
    const result = loadCatalog(raw);
    expect(result.status).toBe('partial');
    if (result.status === 'partial') {
      expect(result.catalog.locations).toHaveLength(1);
      expect(result.discarded).toHaveLength(1);
      expect(result.discarded[0].collection).toBe('locations');
    }
  });

  it('no interpreta una schemaVersion futura (FR-036)', () => {
    const raw = { ...baseCatalog(), schemaVersion: SUPPORTED_SCHEMA_VERSION + 1 };
    const result = loadCatalog(raw);
    expect(result.status).toBe('unsupported-version');
    if (result.status === 'unsupported-version') {
      expect(result.found).toBe(SUPPORTED_SCHEMA_VERSION + 1);
      expect(result.supported).toBe(SUPPORTED_SCHEMA_VERSION);
    }
  });

  it('devuelve invalid ante un JSON ilegible (raíz inválida)', () => {
    const result = loadCatalog({ not: 'a catalog' });
    expect(result.status).toBe('invalid');
  });

  it('descarta una localización con neighbourhoodId inexistente', () => {
    const raw = baseCatalog();
    raw.locations[0].neighbourhoodId = 'nowhere';
    const result = loadCatalog(raw);
    expect(result.status).toBe('partial');
    if (result.status === 'partial') {
      expect(result.catalog.locations).toHaveLength(0);
      expect(result.discarded[0].reason).toMatch(/neighbourhoodId/);
    }
  });
});

describe('loadCatalog — rendimiento', () => {
  it('carga y valida 60 localizaciones sintéticas en menos de 50 ms', () => {
    const raw = baseCatalog();
    const template = raw.locations[0];
    raw.locations = Array.from({ length: 60 }, (_, i) => ({
      ...template,
      id: `synthetic-${i}`,
      thumbnail: { ...template.thumbnail, locationId: `synthetic-${i}` },
      detailImage: { ...template.detailImage, locationId: `synthetic-${i}` },
    }));
    const start = performance.now();
    const result = loadCatalog(raw);
    const elapsed = performance.now() - start;
    expect(result.status).toBe('ok');
    expect(elapsed).toBeLessThan(50);
  });
});
