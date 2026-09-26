import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Linking } from 'react-native';
import { skipOnboarding } from './support.ts';

function locationDouble() {
  return require('expo-location') as {
    __setLocationPermission: (state: string) => void;
    __setServicesEnabled: (enabled: boolean) => void;
    requestForegroundPermissionsAsync: (...args: unknown[]) => Promise<unknown>;
  };
}

/**
 * US2 §3, FR-006 (feature 004): con la denegación permanente, o con los
 * servicios de ubicación del sistema apagados, el punto contextual ofrece
 * abrir los Ajustes en lugar de relanzar el diálogo, que el sistema ya no
 * mostraría.
 */
describe('Ubicación denegada de forma permanente', () => {
  it('tocar la fila de distancia abre "Abrir Ajustes", que llama a Linking.openSettings y nunca al diálogo', async () => {
    locationDouble().__setLocationPermission('blocked');
    await skipOnboarding();

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText(/Distancia no disponible/));

    expect(await screen.findByLabelText('Abrir Ajustes')).toBeTruthy();
    expect(screen.queryByLabelText('Permitir ubicación')).toBeNull();

    fireEvent.press(screen.getByLabelText('Abrir Ajustes'));

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    expect(locationDouble().requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('Servicios de ubicación del sistema apagados', () => {
  it('con el permiso concedido pero los servicios apagados, se ofrece "Abrir Ajustes"', async () => {
    locationDouble().__setLocationPermission('granted');
    locationDouble().__setServicesEnabled(false);
    await skipOnboarding();

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText(/Distancia no disponible/));

    expect(await screen.findByText('Ubicación desactivada')).toBeTruthy();
    fireEvent.press(await screen.findByLabelText('Abrir Ajustes'));

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });
});
