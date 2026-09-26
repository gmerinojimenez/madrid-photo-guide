import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

const SOL = { lat: 40.416775, lng: -3.70379 };

function locationDouble() {
  return require('expo-location') as {
    __setLocationPermission: (state: string) => void;
    __emitPosition: (coords: { lat: number; lng: number }) => void;
  };
}

beforeEach(() => {
  const sqlite = require('expo-sqlite') as { __resetFakeDatabases: () => void };
  sqlite.__resetFakeDatabases();
});

/**
 * US4 §1 §4 (feature 004): sin la compra, el panel de contenido bloqueado
 * muestra la distancia redondeada, estable frente a pequeños desplazamientos;
 * con la compra, la misma localización muestra la distancia exacta.
 */
describe('Panel de contenido bloqueado — distancia redondeada', () => {
  it('sin la compra, muestra "< 1 km" y no cambia al desplazarse 100 m sin cruzar un escalón', async () => {
    locationDouble().__setLocationPermission('granted');
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');
    act(() => {
      // Círculo de Bellas Artes está a ~619 m de la Puerta del Sol.
      locationDouble().__emitPosition(SOL);
    });

    fireEvent.press(await screen.findByLabelText('Círculo de Bellas Artes'));
    expect(await screen.findByText('< 1 km')).toBeTruthy();

    act(() => {
      // ~100 m al norte: sigue por debajo de 1 km, el texto no debe cambiar.
      locationDouble().__emitPosition({ lat: SOL.lat + 0.0009, lng: SOL.lng });
    });
    expect(screen.getByText('< 1 km')).toBeTruthy();
  });

  it('tras comprar, la misma localización muestra la distancia exacta en la ficha', async () => {
    locationDouble().__setLocationPermission('granted');
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');
    act(() => {
      locationDouble().__emitPosition(SOL);
    });

    fireEvent.press(await screen.findByLabelText('Círculo de Bellas Artes'));
    await screen.findByText('< 1 km');
    fireEvent.press(await screen.findByLabelText('Desbloquear'));
    fireEvent.press(await screen.findByText('Comprar'));
    await screen.findByText(/desbloqueada/i);
    fireEvent.press(screen.getByText('Volver al mapa'));

    fireEvent.press(await screen.findByLabelText('Círculo de Bellas Artes'));

    expect(await screen.findByText('619 m')).toBeTruthy();
  });
});
