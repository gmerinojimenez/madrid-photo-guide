import { describe, expect, it } from '@jest/globals';

import { InMemoryAnalyticsSink, type AnalyticsEvent } from '../../src/core/analytics/index.ts';

describe('InMemoryAnalyticsSink', () => {
  it('acumula los eventos en el orden en que se registran', () => {
    const sink = new InMemoryAnalyticsSink();
    sink.track({ name: 'location_permission_result', state: 'granted', origin: 'onboarding' });
    sink.track({ name: 'location_permission_result', state: 'denied', origin: 'contextual' });

    expect(sink.events).toEqual([
      { name: 'location_permission_result', state: 'granted', origin: 'onboarding' },
      { name: 'location_permission_result', state: 'denied', origin: 'contextual' },
    ]);
  });
});

describe('AnalyticsEvent (FR-027)', () => {
  it('no admite coordenadas, distancias ni identificador de localización', () => {
    const withLat: AnalyticsEvent = {
      name: 'location_permission_result',
      state: 'granted',
      origin: 'onboarding',
      // @ts-expect-error un evento de permiso no puede llevar coordenadas
      lat: 40.4168,
    };
    const withLng: AnalyticsEvent = {
      name: 'location_permission_result',
      state: 'granted',
      origin: 'onboarding',
      // @ts-expect-error un evento de permiso no puede llevar coordenadas
      lng: -3.7038,
    };
    const withCoords: AnalyticsEvent = {
      name: 'location_permission_result',
      state: 'granted',
      origin: 'onboarding',
      // @ts-expect-error un evento de permiso no puede llevar coordenadas anidadas
      coords: { lat: 40.4168, lng: -3.7038 },
    };
    const withMeters: AnalyticsEvent = {
      name: 'location_permission_result',
      state: 'granted',
      origin: 'onboarding',
      // @ts-expect-error un evento de permiso no puede llevar distancias
      meters: 450,
    };
    const withLocationId: AnalyticsEvent = {
      name: 'location_permission_result',
      state: 'granted',
      origin: 'onboarding',
      // @ts-expect-error un evento de permiso no puede llevar identificador de localización
      locationId: 'retiro-palacio-cristal',
    };

    // Comprobación en tiempo de ejecución de que estas expresiones se evalúan
    // (para que Jest no reporte el bloque como vacío); lo que las convierte en
    // comprobación real es el `@ts-expect-error` de arriba: si el tipo
    // dejara de rechazar el campo, `npm run typecheck` fallaría.
    expect([withLat, withLng, withCoords, withMeters, withLocationId]).toHaveLength(5);
  });
});
