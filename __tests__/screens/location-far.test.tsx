import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { setAppState, skipOnboarding } from './support.ts';

const SOL = { lat: 40.416775, lng: -3.70379 };
// Toledo: > 50 km de la Puerta del Sol.
const TOLEDO = { lat: 39.862832, lng: -4.027323 };

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
 * US3, casos límite de FR-015 y FR-019 (feature 004): lejos de Madrid, el
 * filtro deja de aplicarse sin vaciar el mapa, y se reaplica solo al volver;
 * al revocar el permiso, el radio vuelve a "Todo Madrid".
 */
describe('Mapa — lejos de Madrid', () => {
  it('con "< 1 km" elegido, al estar lejos de Madrid el filtro deja de aplicarse y avisa', async () => {
    locationDouble().__setLocationPermission('granted');
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');
    act(() => {
      locationDouble().__emitPosition(SOL);
    });
    await screen.findByLabelText('Puerta del Sol');

    fireEvent.press(await screen.findByLabelText('Filtros'));
    fireEvent.press(await screen.findByLabelText('< 1 km'));
    fireEvent.press(screen.getByLabelText('Ver resultados'));
    expect(screen.queryByLabelText('Templo de Debod')).toBeNull(); // filtro activo, 1423 m

    act(() => {
      locationDouble().__emitPosition(TOLEDO);
    });

    expect(await screen.findByText('Estás lejos de Madrid: el filtro de distancia está en pausa')).toBeTruthy();
    expect(screen.getByLabelText('Templo de Debod')).toBeTruthy(); // el filtro ya no aplica: el mapa no se vacía

    // Volver a la Puerta del Sol reaplica "< 1 km" sin volver a tocar nada.
    act(() => {
      locationDouble().__emitPosition(SOL);
    });
    await waitFor(() => {
      expect(screen.queryByLabelText('Templo de Debod')).toBeNull();
    });
    expect(screen.queryByText('Estás lejos de Madrid: el filtro de distancia está en pausa')).toBeNull();
  });

  it('revocar el permiso devuelve el radio a "Todo Madrid"', async () => {
    locationDouble().__setLocationPermission('granted');
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');
    act(() => {
      locationDouble().__emitPosition(SOL);
    });
    await screen.findByLabelText('Puerta del Sol');

    fireEvent.press(await screen.findByLabelText('Filtros'));
    fireEvent.press(await screen.findByLabelText('< 1 km'));
    fireEvent.press(screen.getByLabelText('Ver resultados'));
    expect(screen.queryByLabelText('Templo de Debod')).toBeNull();

    // Revocar "desde Ajustes" y volver a primer plano (US2 §5, FR-007),
    // que es cuando el rastreador relee el permiso del sistema.
    locationDouble().__setLocationPermission('denied');
    act(() => {
      setAppState('background');
      setAppState('active');
    });
    await waitFor(() => {
      expect(screen.queryByLabelText('Templo de Debod')).toBeTruthy();
    });

    fireEvent.press(await screen.findByLabelText('Filtros'));
    const allChip = await screen.findByLabelText('Todo Madrid');
    expect(allChip.props.accessibilityState.selected).toBe(true);
  });
});
