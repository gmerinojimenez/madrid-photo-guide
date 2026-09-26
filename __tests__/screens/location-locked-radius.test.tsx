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
 * US4 §2, FR-021 (feature 004): una localización bloqueada entra o no en el
 * filtro de distancia según su valor redondeado, no el exacto.
 */
describe('Filtro de distancia — localizaciones bloqueadas', () => {
  it('"< 3 km" usa la distancia redondeada de lo bloqueado, no la exacta', async () => {
    locationDouble().__setLocationPermission('granted');
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');
    act(() => {
      locationDouble().__emitPosition(SOL);
    });
    await screen.findByLabelText('Puente de Toledo'); // 2370 m exactos, redondea a ~2,5 km

    fireEvent.press(await screen.findByLabelText('Filtros'));
    fireEvent.press(await screen.findByLabelText('< 3 km'));
    fireEvent.press(screen.getByLabelText('Ver resultados'));

    // 2370 m exactos quedarían dentro de "< 3 km", y su redondeo (~2,5 km)
    // también: el filtro coincide con lo que se ve.
    expect(await screen.findByLabelText('Puente de Toledo')).toBeTruthy();

    // Matadero Madrid está a 2815 m exactos (también < 3 km en la distancia
    // real), pero su redondeo a múltiplos de 0,5 km da ~3,0 km: el filtro,
    // que compara el valor mostrado, la deja fuera.
    expect(screen.queryByLabelText('Matadero Madrid')).toBeNull();
  });
});
