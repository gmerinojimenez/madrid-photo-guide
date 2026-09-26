import { describe, expect, it } from '@jest/globals';

import {
  distanceMeters,
  FAR_FROM_MADRID_M,
  isFarFromMadrid,
  isStale,
  movedEnough,
  MOVE_THRESHOLD_M,
  PUERTA_DEL_SOL,
  STALE_AFTER_MS,
} from '../../../src/core/location/geo.ts';

// Templo de Debod: punto real dentro de Madrid, a escala urbana.
const TEMPLO_DE_DEBOD = { lat: 40.4238, lng: -3.7177 };
// Toledo (Zocodover): punto real fuera de Madrid, a escala larga.
const TOLEDO = { lat: 39.862832, lng: -4.027323 };

const EARTH_RADIUS_M = 6_371_008.8;

/**
 * Referencia independiente de `distanceMeters`: la fórmula esférica del
 * coseno, sobre la misma esfera. Matemáticamente equivalente a haversine,
 * pero con otra formulación — sirve para comprobar SC-002 sin depender de
 * ninguna distancia real recordada de memoria, que podría ser imprecisa.
 */
function referenceDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const cosCentralAngle = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLng);
  // Recortar a [-1, 1]: el error de redondeo puede sacar el coseno de rango para distancias ~0.
  const clamped = Math.min(1, Math.max(-1, cosCentralAngle));
  return EARTH_RADIUS_M * Math.acos(clamped);
}

function withinPercent(actual: number, expected: number, percent: number): boolean {
  return Math.abs(actual - expected) / expected <= percent / 100;
}

describe('distanceMeters', () => {
  it('es 0 para el mismo punto', () => {
    expect(distanceMeters(PUERTA_DEL_SOL, PUERTA_DEL_SOL)).toBe(0);
  });

  it('es simétrica', () => {
    const ab = distanceMeters(PUERTA_DEL_SOL, TEMPLO_DE_DEBOD);
    const ba = distanceMeters(TEMPLO_DE_DEBOD, PUERTA_DEL_SOL);
    expect(ab).toBeCloseTo(ba, 6);
  });

  it('tiene menos de un 1% de error frente a una referencia independiente a escala urbana (SC-002)', () => {
    const meters = distanceMeters(PUERTA_DEL_SOL, TEMPLO_DE_DEBOD);
    const reference = referenceDistanceMeters(PUERTA_DEL_SOL, TEMPLO_DE_DEBOD);
    expect(withinPercent(meters, reference, 1)).toBe(true);
  });

  it('tiene menos de un 1% de error frente a una referencia independiente a escala larga (SC-002)', () => {
    const meters = distanceMeters(PUERTA_DEL_SOL, TOLEDO);
    const reference = referenceDistanceMeters(PUERTA_DEL_SOL, TOLEDO);
    expect(withinPercent(meters, reference, 1)).toBe(true);
  });
});

describe('movedEnough', () => {
  it('es verdadero sin posición previa', () => {
    expect(movedEnough(null, PUERTA_DEL_SOL)).toBe(true);
  });

  it('es falso justo por debajo del umbral', () => {
    // ~0.0002 grados de latitud ≈ 22 m, por debajo de MOVE_THRESHOLD_M (25 m)
    const justBelow = { lat: PUERTA_DEL_SOL.lat + 0.0002, lng: PUERTA_DEL_SOL.lng };
    expect(distanceMeters(PUERTA_DEL_SOL, justBelow)).toBeLessThan(MOVE_THRESHOLD_M);
    expect(movedEnough(PUERTA_DEL_SOL, justBelow)).toBe(false);
  });

  it('es verdadero justo por encima del umbral', () => {
    const justAbove = { lat: PUERTA_DEL_SOL.lat + 0.0003, lng: PUERTA_DEL_SOL.lng };
    expect(distanceMeters(PUERTA_DEL_SOL, justAbove)).toBeGreaterThan(MOVE_THRESHOLD_M);
    expect(movedEnough(PUERTA_DEL_SOL, justAbove)).toBe(true);
  });
});

describe('isFarFromMadrid', () => {
  it('es falso en la Puerta del Sol', () => {
    expect(isFarFromMadrid(PUERTA_DEL_SOL)).toBe(false);
  });

  it('es falso justo por debajo de FAR_FROM_MADRID_M', () => {
    // 0.44 grados de latitud ≈ 48.9 km, por debajo del umbral (50 km)
    const justBelow = { lat: PUERTA_DEL_SOL.lat + 0.44, lng: PUERTA_DEL_SOL.lng };
    expect(distanceMeters(PUERTA_DEL_SOL, justBelow)).toBeLessThan(FAR_FROM_MADRID_M);
    expect(isFarFromMadrid(justBelow)).toBe(false);
  });

  it('es verdadero justo por encima de FAR_FROM_MADRID_M', () => {
    const justAbove = { lat: PUERTA_DEL_SOL.lat + 0.46, lng: PUERTA_DEL_SOL.lng };
    expect(distanceMeters(PUERTA_DEL_SOL, justAbove)).toBeGreaterThan(FAR_FROM_MADRID_M);
    expect(isFarFromMadrid(justAbove)).toBe(true);
  });

  it('es verdadero en Toledo', () => {
    expect(isFarFromMadrid(TOLEDO)).toBe(true);
  });
});

describe('isStale', () => {
  const base = { coords: PUERTA_DEL_SOL, accuracy: 'precise' as const, timestamp: 1_000_000, source: 'live' as const };

  it('es falso a exactamente STALE_AFTER_MS (límite estricto)', () => {
    expect(isStale(base, base.timestamp + STALE_AFTER_MS)).toBe(false);
  });

  it('es verdadero a STALE_AFTER_MS + 1 ms', () => {
    expect(isStale(base, base.timestamp + STALE_AFTER_MS + 1)).toBe(true);
  });
});
