import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

function locationDouble() {
  return require('expo-location') as {
    __setLocationPermission: (state: string) => void;
    requestForegroundPermissionsAsync: (...args: unknown[]) => Promise<unknown>;
  };
}

/**
 * US2 §1 §2 §4, FR-005, FR-006 (feature 004): con el permiso denegado, la app
 * sigue funcionando entera y no lanza ningún diálogo por iniciativa propia;
 * un punto contextual abre el panel de explicación, no el diálogo.
 */
describe('Ubicación denegada', () => {
  it.each<['/' | '/saved' | '/tips' | '/profile', () => Promise<void>]>([
    ['/', async () => {
      expect(await screen.findByLabelText('Buscar localizaciones')).toBeTruthy();
      fireEvent.press(await screen.findByLabelText('Templo de Debod'));
      expect(await screen.findByText('Distancia no disponible')).toBeTruthy();
    }],
    ['/saved', async () => {
      expect(await screen.findByText(/guardar tus localizaciones favoritas/i)).toBeTruthy();
    }],
    ['/tips', async () => {
      expect(await screen.findByText('Sube al Faro de Moncloa al atardecer')).toBeTruthy();
    }],
    ['/profile', async () => {
      expect(await screen.findByText(/\d+ de \d+/)).toBeTruthy();
    }],
  ])('con el permiso denegado, %s funciona sin ningún diálogo', async (url, assertions) => {
    locationDouble().__setLocationPermission('denied');
    await skipOnboarding();

    renderRouter('app', { initialUrl: url });
    await assertions();

    expect(locationDouble().requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('tocar la fila de distancia abre el panel de explicación sin llamar al diálogo', async () => {
    locationDouble().__setLocationPermission('denied');
    await skipOnboarding();

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText(/Distancia no disponible/));

    expect(await screen.findByLabelText('Permitir ubicación')).toBeTruthy();
    expect(locationDouble().requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('"Permitir ubicación" en el panel sí lanza el diálogo', async () => {
    locationDouble().__setLocationPermission('denied');
    await skipOnboarding();

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText(/Distancia no disponible/));
    fireEvent.press(await screen.findByLabelText('Permitir ubicación'));

    expect(locationDouble().requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('"Ahora no" cierra el panel sin llamar al diálogo', async () => {
    locationDouble().__setLocationPermission('denied');
    await skipOnboarding();

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText(/Distancia no disponible/));
    expect(await screen.findByLabelText('Permitir ubicación')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Ahora no'));

    expect(screen.queryByLabelText('Permitir ubicación')).toBeNull();
    expect(locationDouble().requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});
