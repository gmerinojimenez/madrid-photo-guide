import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

const TEMPLO_DE_DEBOD = { lat: 40.424069, lng: -3.717613 };

function locationDouble() {
  return require('expo-location') as {
    __setLocationPermission: (state: string) => void;
    __emitPosition: (coords: { lat: number; lng: number }) => void;
  };
}

function preferencesDouble() {
  return require('expo-sqlite') as {
    __seedPreference: (key: string, value: string) => Promise<void>;
    __resetFakeDatabases: () => void;
  };
}

// Ambos tests siembran `location.last` con valores distintos: sin resetear la
// base de datos falsa entre ellos, el segundo `INSERT` conviviría con el
// primero y `getFirstAsync` devolvería la fila más antigua (mismo motivo que
// documenta `storage-sqlite.test.ts`).
beforeEach(() => {
  preferencesDouble().__resetFakeDatabases();
});

/**
 * FR-023, FR-024 (feature 004): la última posición conocida se usa de
 * inmediato al arrancar; si tiene más de 10 min, la distancia se marca como
 * antigua hasta que llega una lectura nueva.
 */
describe('Ficha de localización — última posición conocida', () => {
  it('con location.last sembrada y permiso concedido, la ficha muestra la distancia sin emitir ninguna posición', async () => {
    await skipOnboarding();
    await preferencesDouble().__seedPreference(
      'location.last',
      JSON.stringify({ lat: TEMPLO_DE_DEBOD.lat, lng: TEMPLO_DE_DEBOD.lng, accuracy: 'precise', timestamp: Date.now() }),
    );
    locationDouble().__setLocationPermission('granted');

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));

    expect(await screen.findByText('0 m')).toBeTruthy();
  });

  it('una última posición de hace más de 10 minutos se marca como antigua, y la marca desaparece con una lectura nueva', async () => {
    await skipOnboarding();
    await preferencesDouble().__seedPreference(
      'location.last',
      JSON.stringify({
        lat: TEMPLO_DE_DEBOD.lat,
        lng: TEMPLO_DE_DEBOD.lng,
        accuracy: 'precise',
        timestamp: Date.now() - 11 * 60_000,
      }),
    );
    locationDouble().__setLocationPermission('granted');

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));

    expect(await screen.findByText('0 m')).toBeTruthy();
    expect(await screen.findByText('posición antigua')).toBeTruthy();

    act(() => {
      locationDouble().__emitPosition(TEMPLO_DE_DEBOD);
    });

    expect(await screen.findByText('0 m')).toBeTruthy();
    expect(screen.queryByText('posición antigua')).toBeNull();
  });
});

