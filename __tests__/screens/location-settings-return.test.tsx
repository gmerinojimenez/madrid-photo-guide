import { describe, expect, it } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { setAppState, skipOnboarding } from './support.ts';

const TEMPLO_DE_DEBOD = { lat: 40.424, lng: -3.71766 };

function locationDouble() {
  return require('expo-location') as {
    __setLocationPermission: (state: string) => void;
    __emitPosition: (coords: { lat: number; lng: number }) => void;
  };
}

/**
 * US2 §5, FR-007, FR-025 (feature 004): al volver del segundo plano, la app
 * refleja el permiso cambiado en Ajustes sin reiniciarse, en las dos
 * direcciones.
 */
describe('Vuelta de Ajustes', () => {
  it('de denegado a concedido: aparece la distancia al volver a primer plano', async () => {
    locationDouble().__setLocationPermission('denied');
    await skipOnboarding();

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    expect(await screen.findByText('Distancia no disponible')).toBeTruthy();

    locationDouble().__setLocationPermission('granted');
    act(() => {
      setAppState('background');
      setAppState('active');
    });

    await screen.findByText('Buscando tu posición…');
    act(() => {
      locationDouble().__emitPosition(TEMPLO_DE_DEBOD);
    });

    expect(await screen.findByText('0 m')).toBeTruthy();
  });

  it('de concedido a denegado: desaparece la distancia y el punto de posición al volver', async () => {
    locationDouble().__setLocationPermission('granted');
    await skipOnboarding();

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    act(() => {
      locationDouble().__emitPosition(TEMPLO_DE_DEBOD);
    });
    expect(await screen.findByText('0 m')).toBeTruthy();

    locationDouble().__setLocationPermission('denied');
    act(() => {
      setAppState('background');
      setAppState('active');
    });

    expect(await screen.findByText('Distancia no disponible')).toBeTruthy();
  });
});
