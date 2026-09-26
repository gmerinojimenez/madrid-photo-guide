import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Linking } from 'react-native';
import { setAppState, skipOnboarding } from './support.ts';

function locationDouble() {
  return require('expo-location') as {
    __setLocationPermission: (state: string) => void;
    requestForegroundPermissionsAsync: (...args: unknown[]) => Promise<unknown>;
  };
}

beforeEach(() => {
  const sqlite = require('expo-sqlite') as { __resetFakeDatabases: () => void };
  sqlite.__resetFakeDatabases();
});

/**
 * US5 §1-§4, FR-007, FR-009 (feature 004): la fila "Ubicación" del perfil
 * muestra el estado y hace la acción que le corresponde en cada uno.
 */
describe('Perfil — fila de ubicación', () => {
  it.each<['undetermined' | 'granted' | 'approximate' | 'denied' | 'blocked', string]>([
    ['undetermined', 'Sin pedir'],
    ['granted', 'Concedida'],
    ['approximate', 'Aproximada'],
    ['denied', 'Denegada'],
    ['blocked', 'Denegada'],
  ])('estado %s -> etiqueta %s', async (state, label) => {
    locationDouble().__setLocationPermission(state);
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/profile' });

    const row = await screen.findByLabelText('Ubicación');
    expect(await screen.findByText(label)).toBeTruthy();
    expect(row).toBeTruthy();
  });

  it.each(['undetermined', 'denied'] as const)(
    'estado %s: tocar la fila lanza el diálogo, con origen "profile"',
    async (state) => {
      locationDouble().__setLocationPermission(state);
      await skipOnboarding();
      renderRouter('app', { initialUrl: '/profile' });

      fireEvent.press(await screen.findByLabelText('Ubicación'));

      expect(locationDouble().requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(Linking.openSettings).not.toHaveBeenCalled();
    },
  );

  it.each(['approximate', 'blocked', 'granted'] as const)(
    'estado %s: tocar la fila abre Ajustes, sin diálogo',
    async (state) => {
      locationDouble().__setLocationPermission(state);
      await skipOnboarding();
      renderRouter('app', { initialUrl: '/profile' });

      fireEvent.press(await screen.findByLabelText('Ubicación'));

      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
      expect(locationDouble().requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    },
  );

  it('el valor cambia al volver de Ajustes sin salir de la pantalla (FR-007)', async () => {
    locationDouble().__setLocationPermission('denied');
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/profile' });
    await screen.findByText('Denegada');

    locationDouble().__setLocationPermission('granted');
    act(() => {
      setAppState('background');
      setAppState('active');
    });

    expect(await screen.findByText('Concedida')).toBeTruthy();
  });
});
