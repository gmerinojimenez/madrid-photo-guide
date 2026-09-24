import { describe, expect, it } from '@jest/globals';

import { accessOf, isFullLocation, viewLocation, visibleDistance } from '../../src/core/content/access.ts';
import { loadCatalog } from '../../src/core/content/catalog.ts';
import rawCatalog from '../../src/content/catalog.json';
import type { Location } from '../../src/core/content/schema.ts';
import type { LocationSnapshot } from '../../src/core/location/ports.ts';

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

describe('visibleDistance (feature 004, FR-020–FR-022)', () => {
  const REFERENCE = { lat: 40.416775, lng: -3.70379 }; // Puerta del Sol
  const EARTH_RADIUS_M = 6_371_008.8; // debe coincidir con src/core/location/geo.ts
  const NOW = 1_700_000_000_000;

  /**
   * Punto a `meters` al norte de `from`, en la misma longitud. Con `dLng = 0`
   * la fórmula de haversine se reduce exactamente al arco del meridiano, así
   * que la distancia resultante coincide con `meters` sin margen de error:
   * sirve para fijar límites exactos de redondeo (1100, 2800, 1249, 1251 m).
   */
  function pointAtDistance(from: { lat: number; lng: number }, meters: number) {
    const degOffset = (meters / EARTH_RADIUS_M) * (180 / Math.PI);
    return { lat: from.lat + degOffset, lng: from.lng };
  }

  // La posición de la persona se fija siempre en REFERENCE; es `locationAt`
  // quien se desplaza `meters` desde ahí, para que la distancia entre ambas
  // sea exactamente la que cada test pide.
  function snapshotAt(
    overrides: Partial<{ accuracy: 'precise' | 'approximate'; timestamp: number }> = {},
  ): LocationSnapshot {
    return {
      permission: overrides.accuracy === 'approximate' ? 'approximate' : 'granted',
      servicesEnabled: true,
      position: {
        coords: REFERENCE,
        accuracy: overrides.accuracy ?? 'precise',
        timestamp: overrides.timestamp ?? NOW,
        source: 'live',
      },
    };
  }

  function locationAt(meters: number, access: 'free' | 'premium'): Location {
    return baseLocation({ access, coords: pointAtDistance(REFERENCE, meters) });
  }

  it('gratuita: distancia exacta', () => {
    const result = visibleDistance(locationAt(450, 'free'), { owned: false }, snapshotAt(), NOW);
    expect(result.kind).toBe('exact');
    if (result.kind === 'exact') expect(result.meters).toBeCloseTo(450, 6);
  });

  it('de pago con la compra: distancia exacta', () => {
    const result = visibleDistance(locationAt(1234, 'premium'), { owned: true }, snapshotAt(), NOW);
    expect(result.kind).toBe('exact');
    if (result.kind === 'exact') expect(result.meters).toBeCloseTo(1234, 6);
  });

  it.each<[number, 'under-1km' | { halfKm: number }]>([
    [999, 'under-1km'],
    [1100, { halfKm: 2 }],
    [2800, { halfKm: 6 }],
    [1249, { halfKm: 2 }],
    [1251, { halfKm: 3 }],
  ])('de pago sin la compra a %p m: redondea a %p', (meters, expectedBand) => {
    const result = visibleDistance(locationAt(meters, 'premium'), { owned: false }, snapshotAt(), NOW);
    expect(result.kind).toBe('rounded');
    if (result.kind === 'rounded') expect(result.band).toEqual(expectedBand);
  });

  it('SC-005: una distancia redondeada no filtra los metros exactos ni las coordenadas de la localización', () => {
    const location = locationAt(1100, 'premium');
    const result = visibleDistance(location, { owned: false }, snapshotAt(), NOW);
    expect(result.kind).toBe('rounded');
    if (result.kind !== 'rounded') return;

    expect(result).not.toHaveProperty('meters');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('1100');
    expect(serialized).not.toContain(String(location.coords.lat));
    expect(serialized).not.toContain(String(location.coords.lng));
  });

  it('sin permiso: no disponible por falta de permiso', () => {
    const snapshot: LocationSnapshot = { permission: 'denied', servicesEnabled: true, position: null };
    const result = visibleDistance(locationAt(450, 'free'), { owned: false }, snapshot, NOW);
    expect(result).toEqual({ kind: 'unavailable', reason: 'no-permission' });
  });

  it('concedido, sin posición, servicios apagados: no disponible por servicios', () => {
    const snapshot: LocationSnapshot = { permission: 'granted', servicesEnabled: false, position: null };
    const result = visibleDistance(locationAt(450, 'free'), { owned: false }, snapshot, NOW);
    expect(result).toEqual({ kind: 'unavailable', reason: 'services-off' });
  });

  it('concedido, sin posición, servicios activos: no disponible por falta de posición', () => {
    const snapshot: LocationSnapshot = { permission: 'granted', servicesEnabled: true, position: null };
    const result = visibleDistance(locationAt(450, 'free'), { owned: false }, snapshot, NOW);
    expect(result).toEqual({ kind: 'unavailable', reason: 'no-position' });
  });

  it('marca aproximada cuando la posición viene de un permiso aproximado', () => {
    const result = visibleDistance(
      locationAt(450, 'free'),
      { owned: false },
      snapshotAt({ accuracy: 'approximate' }),
      NOW,
    );
    expect(result).toMatchObject({ approximate: true });
  });

  it('marca antigua cuando la posición tiene más de 10 minutos', () => {
    const result = visibleDistance(
      locationAt(450, 'free'),
      { owned: false },
      snapshotAt({ timestamp: NOW - 10 * 60_000 - 1 }),
      NOW,
    );
    expect(result).toMatchObject({ stale: true });
  });

  it('sin marcas cuando la posición es precisa y reciente', () => {
    const result = visibleDistance(locationAt(450, 'free'), { owned: false }, snapshotAt(), NOW);
    expect(result).toMatchObject({ approximate: false, stale: false });
  });
});
