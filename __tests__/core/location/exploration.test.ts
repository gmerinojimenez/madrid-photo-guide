import { describe, expect, it } from '@jest/globals';

import {
  effectiveRadius,
  explorationAvailability,
  withinRadius,
} from '../../../src/core/location/exploration.ts';
import { PUERTA_DEL_SOL } from '../../../src/core/location/geo.ts';
import type { ExplorationAvailability, LocationSnapshot, VisibleDistance } from '../../../src/core/location/ports.ts';

const NEAR_MADRID = { ...PUERTA_DEL_SOL };
// Toledo: > 50 km de la Puerta del Sol.
const FAR_FROM_MADRID = { lat: 39.862832, lng: -4.027323 };

function snapshot(overrides: Partial<LocationSnapshot>): LocationSnapshot {
  return {
    permission: 'granted',
    servicesEnabled: true,
    position: { coords: NEAR_MADRID, accuracy: 'precise', timestamp: 0, source: 'live' },
    ...overrides,
  };
}

describe('explorationAvailability', () => {
  it('disponible con permiso concedido, servicios activos y posición en Madrid', () => {
    expect(explorationAvailability(snapshot({}))).toEqual({ available: true });
  });

  it('disponible con permiso aproximado', () => {
    expect(explorationAvailability(snapshot({ permission: 'approximate' }))).toEqual({ available: true });
  });

  it.each(['undetermined', 'denied', 'blocked'] as const)(
    'no disponible por falta de permiso: %s',
    (permission) => {
      expect(explorationAvailability(snapshot({ permission, position: null }))).toEqual({
        available: false,
        reason: 'no-permission',
      });
    },
  );

  it('no disponible por servicios apagados cuando no hay posición', () => {
    expect(explorationAvailability(snapshot({ servicesEnabled: false, position: null }))).toEqual({
      available: false,
      reason: 'services-off',
    });
  });

  it('no disponible por falta de posición cuando los servicios están activos', () => {
    expect(explorationAvailability(snapshot({ position: null }))).toEqual({
      available: false,
      reason: 'no-position',
    });
  });

  it('no disponible por lejanía cuando la posición está fuera de Madrid', () => {
    const far: LocationSnapshot = snapshot({
      position: { coords: FAR_FROM_MADRID, accuracy: 'precise', timestamp: 0, source: 'live' },
    });
    expect(explorationAvailability(far)).toEqual({ available: false, reason: 'far-from-madrid' });
  });

  it('prioriza no-permission sobre servicios apagados y sobre falta de posición', () => {
    expect(
      explorationAvailability({ permission: 'denied', servicesEnabled: false, position: null }),
    ).toEqual({ available: false, reason: 'no-permission' });
  });
});

describe('effectiveRadius', () => {
  it('devuelve el radio elegido si está disponible', () => {
    const available: ExplorationAvailability = { available: true };
    expect(effectiveRadius('under-1km', available)).toBe('under-1km');
  });

  it('devuelve "all" si no está disponible', () => {
    const unavailable: ExplorationAvailability = { available: false, reason: 'far-from-madrid' };
    expect(effectiveRadius('under-1km', unavailable)).toBe('all');
  });
});

describe('withinRadius', () => {
  it('"all" siempre es verdadero', () => {
    const d: VisibleDistance = { kind: 'unavailable', reason: 'no-permission' };
    expect(withinRadius(d, 'all')).toBe(true);
  });

  it('"unavailable" nunca entra en un radio concreto', () => {
    const d: VisibleDistance = { kind: 'unavailable', reason: 'no-position' };
    expect(withinRadius(d, 'under-1km')).toBe(false);
    expect(withinRadius(d, 'under-3km')).toBe(false);
  });

  it.each<[number, 'under-1km' | 'under-3km', boolean]>([
    [999, 'under-1km', true],
    [1000, 'under-1km', false],
    [2999, 'under-3km', true],
    [3000, 'under-3km', false],
  ])('exact %p m en %s -> %p (límite estricto)', (meters, radius, expected) => {
    const d: VisibleDistance = { kind: 'exact', meters, approximate: false, stale: false };
    expect(withinRadius(d, radius)).toBe(expected);
  });

  it('rounded under-1km entra en los dos radios', () => {
    const d: VisibleDistance = { kind: 'rounded', band: 'under-1km', approximate: false, stale: false };
    expect(withinRadius(d, 'under-1km')).toBe(true);
    expect(withinRadius(d, 'under-3km')).toBe(true);
  });

  it('rounded { halfKm: 5 } (2,5 km) entra en < 3 km pero no en < 1 km', () => {
    const d: VisibleDistance = { kind: 'rounded', band: { halfKm: 5 }, approximate: false, stale: false };
    expect(withinRadius(d, 'under-1km')).toBe(false);
    expect(withinRadius(d, 'under-3km')).toBe(true);
  });

  it('rounded { halfKm: 6 } (3,0 km) no entra en ningún radio (límite estricto)', () => {
    const d: VisibleDistance = { kind: 'rounded', band: { halfKm: 6 }, approximate: false, stale: false };
    expect(withinRadius(d, 'under-3km')).toBe(false);
  });
});
