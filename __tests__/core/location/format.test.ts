import { describe, expect, it } from '@jest/globals';

import { formatDistance, formatVisibleDistance } from '../../../src/core/location/format.ts';
import type { VisibleDistance } from '../../../src/core/location/ports.ts';

describe('formatDistance', () => {
  it.each([
    [0, '0 m'],
    [450, '450 m'],
    [999.4, '999 m'],
    [999.6, '1,0 km'],
    [1000, '1,0 km'],
    [1234, '1,2 km'],
    [12345, '12,3 km'],
  ])('formatDistance(%p) === %p', (meters, expected) => {
    expect(formatDistance(meters)).toBe(expected);
  });

  it('siempre usa coma decimal, nunca punto', () => {
    expect(formatDistance(1234)).not.toContain('.');
  });
});

describe('formatVisibleDistance', () => {
  it('exact en metros: solo el valor, sin detalle', () => {
    const d: VisibleDistance = { kind: 'exact', meters: 450, approximate: false, stale: false };
    expect(formatVisibleDistance(d)).toEqual({ value: '450 m', detail: null });
  });

  it('exact en km', () => {
    const d: VisibleDistance = { kind: 'exact', meters: 1234, approximate: false, stale: false };
    expect(formatVisibleDistance(d)).toEqual({ value: '1,2 km', detail: null });
  });

  it('rounded under-1km', () => {
    const d: VisibleDistance = { kind: 'rounded', band: 'under-1km', approximate: false, stale: false };
    expect(formatVisibleDistance(d)).toEqual({ value: '< 1 km', detail: null });
  });

  it('rounded con halfKm', () => {
    const d: VisibleDistance = { kind: 'rounded', band: { halfKm: 5 }, approximate: false, stale: false };
    expect(formatVisibleDistance(d)).toEqual({ value: '~2,5 km', detail: null });
  });

  it('marca aproximada', () => {
    const d: VisibleDistance = { kind: 'exact', meters: 450, approximate: true, stale: false };
    expect(formatVisibleDistance(d)).toEqual({ value: '450 m', detail: 'aproximada' });
  });

  it('marca antigua', () => {
    const d: VisibleDistance = { kind: 'exact', meters: 450, approximate: false, stale: true };
    expect(formatVisibleDistance(d)).toEqual({ value: '450 m', detail: 'posición antigua' });
  });

  it('marcas combinadas, aproximada primero', () => {
    const d: VisibleDistance = { kind: 'exact', meters: 450, approximate: true, stale: true };
    expect(formatVisibleDistance(d)).toEqual({ value: '450 m', detail: 'aproximada · posición antigua' });
  });

  it('unavailable: no-permission', () => {
    const d: VisibleDistance = { kind: 'unavailable', reason: 'no-permission' };
    expect(formatVisibleDistance(d)).toEqual({
      value: 'Distancia no disponible',
      detail: 'Sin permiso de ubicación',
    });
  });

  it('unavailable: services-off', () => {
    const d: VisibleDistance = { kind: 'unavailable', reason: 'services-off' };
    expect(formatVisibleDistance(d)).toEqual({
      value: 'Distancia no disponible',
      detail: 'Ubicación desactivada en el sistema',
    });
  });

  it('unavailable: no-position', () => {
    const d: VisibleDistance = { kind: 'unavailable', reason: 'no-position' };
    expect(formatVisibleDistance(d)).toEqual({
      value: 'Distancia no disponible',
      detail: 'Buscando tu posición…',
    });
  });
});
