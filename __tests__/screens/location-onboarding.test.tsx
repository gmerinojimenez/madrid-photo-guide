import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

/**
 * US1 §1 §2, FR-004 (feature 004): "Activar ubicación" lanza el diálogo del
 * sistema una vez y, sea cual sea la respuesta, avanza al paso siguiente.
 * "Ahora no" avanza sin lanzarlo.
 */
describe('Presentación inicial — permiso de ubicación', () => {
  it('"Activar ubicación" lanza el diálogo del sistema y avanza si se concede', async () => {
    const location = require('expo-location') as {
      requestForegroundPermissionsAsync: (...args: unknown[]) => Promise<unknown>;
      __answerNextRequestWith: (state: string) => void;
    };
    location.__answerNextRequestWith('granted');

    renderRouter('app', { initialUrl: '/onboarding' });
    fireEvent.press(await screen.findByText('Cómo funciona'));
    fireEvent.press(await screen.findByLabelText('Activar ubicación'));

    expect(await screen.findByText('Empezar gratis')).toBeTruthy();
    expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('"Activar ubicación" avanza igual si el permiso se deniega', async () => {
    const location = require('expo-location') as {
      requestForegroundPermissionsAsync: (...args: unknown[]) => Promise<unknown>;
      __answerNextRequestWith: (state: string) => void;
    };
    location.__answerNextRequestWith('denied');

    renderRouter('app', { initialUrl: '/onboarding' });
    fireEvent.press(await screen.findByText('Cómo funciona'));
    fireEvent.press(await screen.findByLabelText('Activar ubicación'));

    expect(await screen.findByText('Empezar gratis')).toBeTruthy();
    expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('"Ahora no" avanza sin lanzar el diálogo del sistema', async () => {
    const location = require('expo-location') as {
      requestForegroundPermissionsAsync: (...args: unknown[]) => Promise<unknown>;
    };

    renderRouter('app', { initialUrl: '/onboarding' });
    fireEvent.press(await screen.findByText('Cómo funciona'));
    expect(await screen.findByLabelText('Activar ubicación')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Ahora no'));

    expect(await screen.findByText('Empezar gratis')).toBeTruthy();
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});
