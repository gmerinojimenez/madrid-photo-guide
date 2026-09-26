import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

const SOL = { lat: 40.416775, lng: -3.70379 };

// Un test emite una posición, que el rastreador cachea en `location.last`; sin
// resetear la base falsa entre tests, el siguiente la heredaría al arrancar
// (mismo motivo que documenta location-cache.test.tsx).
beforeEach(() => {
  const sqlite = require('expo-sqlite') as { __resetFakeDatabases: () => void };
  sqlite.__resetFakeDatabases();
});

function locationDouble() {
  return require('expo-location') as {
    __setLocationPermission: (state: string) => void;
    __answerNextRequestWith: (state: string) => void;
    __emitPosition: (coords: { lat: number; lng: number }) => void;
    requestForegroundPermissionsAsync: (...args: unknown[]) => Promise<unknown>;
  };
}

function mapsDouble() {
  return require('expo-maps') as { __lastSetCameraPosition: () => unknown };
}

/**
 * US3 §1 §2 §5 (feature 004): el mapa muestra el punto de posición solo con
 * el permiso concedido, y "Centrar en mí" pide el permiso si falta y mueve
 * la cámara cuando hay una posición.
 */
describe('Mapa — punto de posición y centrar en mí', () => {
  it('con permiso undetermined, no se muestra el punto de posición', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');

    expect(screen.queryByTestId('user-location-dot')).toBeNull();
  });

  it('con permiso concedido, se muestra el punto de posición', async () => {
    locationDouble().__setLocationPermission('granted');
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });

    expect(await screen.findByTestId('user-location-dot')).toBeTruthy();
  });

  it('"Centrar en mi posición" con permiso sin pedir lanza el diálogo', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Centrar en mi posición'));

    expect(locationDouble().requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('con permiso y posición, "Centrar en mi posición" mueve la cámara', async () => {
    locationDouble().__setLocationPermission('granted');
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');

    act(() => {
      locationDouble().__emitPosition(SOL);
    });
    fireEvent.press(await screen.findByLabelText('Centrar en mi posición'));

    expect(mapsDouble().__lastSetCameraPosition()).toMatchObject({
      coordinates: { latitude: SOL.lat, longitude: SOL.lng },
    });
  });

  it('con permiso pero sin posición todavía, no centra y lo indica', async () => {
    locationDouble().__setLocationPermission('granted');
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones'); // deja que start() se resuelva
    fireEvent.press(await screen.findByLabelText('Centrar en mi posición'));

    expect(await screen.findByText('Buscando tu posición…')).toBeTruthy();
    expect(mapsDouble().__lastSetCameraPosition()).toBeNull();
  });
});
