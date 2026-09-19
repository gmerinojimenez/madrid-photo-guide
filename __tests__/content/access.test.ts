import { describe, expect, it } from '@jest/globals';

import { accessOf, isFullLocation, viewLocation } from '../../src/core/content/access.ts';
import { loadCatalog } from '../../src/core/content/catalog.ts';
import rawCatalog from '../../src/content/catalog.json';
import type { Location } from '../../src/core/content/schema.ts';

const PREMIUM_ONLY_KEYS = [
  'coords',
  'bestTime',
  'shotDescription',
  'capture',
  'detailImage',
  'extraImages',
] as const;

function baseLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'sol',
    name: { es: 'Puerta del Sol' },
    neighbourhoodId: 'centro',
    tagIds: [],
    approximateArea: { lat: 40.4169, lng: -3.7033, radiusMeters: 300 },
    access: 'free',
    thumbnail: { locationId: 'sol', usage: 'thumb', alt: { es: 'alt' } },
    coords: { lat: 40.4169, lng: -3.7033 },
    shotDescription: { es: 'desc' },
    detailImage: { locationId: 'sol', usage: 'detail', alt: { es: 'alt' } },
    ...overrides,
  };
}

describe('accessOf', () => {
  it('clasifica una localización free', () => {
    expect(accessOf(baseLocation({ access: 'free' }))).toBe('free');
  });

  it('clasifica una localización premium', () => {
    expect(accessOf(baseLocation({ access: 'premium' }))).toBe('premium');
  });

  it('trata como premium una localización sin campo access legible al cargar', () => {
    const raw = {
      schemaVersion: 1,
      updatedAt: '2026-09-18',
      locales: ['es'],
      access: { premiumFields: [] },
      tags: [{ id: 'skyline', label: { es: 'Skyline' } }],
      tipCategories: [{ id: 'ver', label: { es: 'Ver' } }],
      neighbourhoods: [{ id: 'centro', name: { es: 'Centro' } }],
      locations: [
        {
          id: 'sol',
          name: { es: 'Puerta del Sol' },
          neighbourhoodId: 'centro',
          tagIds: ['skyline'],
          approximateArea: { lat: 40.4169, lng: -3.7033, radiusMeters: 300 },
          thumbnail: { locationId: 'sol', usage: 'thumb', alt: { es: 'alt' } },
          coords: { lat: 40.4169, lng: -3.7033 },
          shotDescription: { es: 'desc' },
          detailImage: { locationId: 'sol', usage: 'detail', alt: { es: 'alt' } },
        },
      ],
      tips: [],
    };
    const result = loadCatalog(raw);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(accessOf(result.catalog.locations[0])).toBe('premium');
  });

  it('trata como premium un valor de access no reconocido al cargar', () => {
    const raw = {
      schemaVersion: 1,
      updatedAt: '2026-09-18',
      locales: ['es'],
      access: { premiumFields: [] },
      tags: [{ id: 'skyline', label: { es: 'Skyline' } }],
      tipCategories: [{ id: 'ver', label: { es: 'Ver' } }],
      neighbourhoods: [{ id: 'centro', name: { es: 'Centro' } }],
      locations: [
        {
          id: 'sol',
          name: { es: 'Puerta del Sol' },
          neighbourhoodId: 'centro',
          tagIds: ['skyline'],
          access: 'gratis-total',
          approximateArea: { lat: 40.4169, lng: -3.7033, radiusMeters: 300 },
          thumbnail: { locationId: 'sol', usage: 'thumb', alt: { es: 'alt' } },
          coords: { lat: 40.4169, lng: -3.7033 },
          shotDescription: { es: 'desc' },
          detailImage: { locationId: 'sol', usage: 'detail', alt: { es: 'alt' } },
        },
      ],
      tips: [],
    };
    const result = loadCatalog(raw);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(accessOf(result.catalog.locations[0])).toBe('premium');
  });
});

describe('viewLocation — proyección de acceso', () => {
  it('una localización de pago sin compra devuelve la vista previa y ningún campo reservado (SC-008)', () => {
    const location = baseLocation({ access: 'premium' });
    const view = viewLocation(location, { owned: false });
    expect(isFullLocation(view)).toBe(false);
    for (const key of PREMIUM_ONLY_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(view, key)).toBe(false);
    }
  });

  it('una localización de pago con compra devuelve la ficha completa', () => {
    const location = baseLocation({ access: 'premium' });
    const view = viewLocation(location, { owned: true });
    expect(isFullLocation(view)).toBe(true);
    if (isFullLocation(view)) {
      expect(view.coords).toEqual(location.coords);
    }
  });

  it('una localización gratuita devuelve la ficha completa sin compra', () => {
    const location = baseLocation({ access: 'free' });
    const view = viewLocation(location, { owned: false });
    expect(isFullLocation(view)).toBe(true);
  });

  it('access.premiumFields del catálogo real coincide con la proyección del núcleo (D-006)', () => {
    const result = loadCatalog(rawCatalog);
    if (result.status !== 'ok') throw new Error('catalog did not load');
    const location = { ...result.catalog.locations[0], access: 'premium' as const };
    const preview = viewLocation(location, { owned: false });
    for (const field of result.catalog.access.premiumFields) {
      if (field === 'neighbourhoodDescription') continue;
      expect(Object.prototype.hasOwnProperty.call(preview, field)).toBe(false);
    }
  });
});
