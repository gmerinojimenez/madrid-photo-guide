import { describe, expect, it } from '@jest/globals';

import { parsePosition, serializePosition } from '../../../src/core/location/cache.ts';
import type { UserPosition } from '../../../src/core/location/ports.ts';

describe('serializePosition / parsePosition', () => {
  it('ida y vuelta preserva los campos y marca la procedencia como caché', () => {
    const position: UserPosition = {
      coords: { lat: 40.4168, lng: -3.7038 },
      accuracy: 'precise',
      timestamp: 1_790_000_000_000,
      source: 'live',
    };
    const restored = parsePosition(serializePosition(position));
    expect(restored).toEqual({ ...position, source: 'cache' });
  });

  it('preserva accuracy aproximada', () => {
    const position: UserPosition = {
      coords: { lat: 40.4168, lng: -3.7038 },
      accuracy: 'approximate',
      timestamp: 1_790_000_000_000,
      source: 'live',
    };
    const restored = parsePosition(serializePosition(position));
    expect(restored?.accuracy).toBe('approximate');
  });

  it.each([
    ['null', null],
    ['cadena vacía', ''],
    ['JSON inválido', '{not json'],
    ['objeto sin campos', '{}'],
    ['falta timestamp', '{"lat":40.4,"lng":-3.7,"accuracy":"precise"}'],
    ['accuracy desconocida', '{"lat":40.4,"lng":-3.7,"accuracy":"gps","timestamp":1}'],
    ['lat fuera de rango', '{"lat":140,"lng":-3.7,"accuracy":"precise","timestamp":1}'],
    ['lat como texto', '{"lat":"40.4","lng":-3.7,"accuracy":"precise","timestamp":1}'],
    ['array en lugar de objeto', '[1,2,3]'],
  ])('parsePosition devuelve null sin lanzar: %s', (_name, raw) => {
    expect(() => parsePosition(raw)).not.toThrow();
    expect(parsePosition(raw)).toBeNull();
  });
});
