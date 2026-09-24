import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

const SOL = { lat: 40.416775, lng: -3.70379 };

function locationDouble() {
  return require('expo-location') as {
    __setLocationPermission: (state: string) => void;
    __answerNextRequestWith: (state: string) => void;
    __emitPosition: (coords: { lat: number; lng: number }) => void;
  };
}

beforeEach(() => {
  const sqlite = require('expo-sqlite') as { __resetFakeDatabases: () => void };
  sqlite.__resetFakeDatabases();
});

async function renderAtSol() {
  locationDouble().__setLocationPermission('granted');
  await skipOnboarding();
  renderRouter('app', { initialUrl: '/' });
  await screen.findByLabelText('Buscar localizaciones');
  act(() => {
    locationDouble().__emitPosition(SOL);
  });
  await screen.findByLabelText('Puerta del Sol');
}

/**
 * US3 §3 §4 §5 §6, FR-017, FR-018, FR-019 (feature 004): el filtro de
 * distancia deja solo lo cercano, se compone con los demás criterios, "Todo
 * Madrid" lo desactiva, y sin permiso el chip lo pide.
 */
describe('Mapa — filtro de distancia', () => {
  it('"< 1 km" deja solo las localizaciones a menos de 1 km, compuesto con búsqueda y etiqueta', async () => {
    await renderAtSol();

    fireEvent.press(await screen.findByLabelText('Filtros'));
    fireEvent.press(await screen.findByLabelText('< 1 km'));
    fireEvent.press(screen.getByLabelText('Ver resultados'));

    expect(await screen.findByLabelText('Puerta del Sol')).toBeTruthy();
    expect(screen.queryByLabelText('Templo de Debod')).toBeNull(); // 1423 m, fuera de < 1 km

    // Compuesto con la búsqueda (FR-018): buscar "debod" con el radio activo
    // no debe traer de vuelta esa localización, aunque el texto coincida.
    fireEvent.changeText(await screen.findByLabelText('Buscar localizaciones'), 'debod');
    expect(screen.queryByLabelText('Templo de Debod')).toBeNull();
  });

  it('"Todo Madrid" deja de filtrar', async () => {
    await renderAtSol();

    fireEvent.press(await screen.findByLabelText('Filtros'));
    fireEvent.press(await screen.findByLabelText('< 1 km'));
    fireEvent.press(screen.getByLabelText('Ver resultados'));
    expect(screen.queryByLabelText('Templo de Debod')).toBeNull();

    fireEvent.press(await screen.findByLabelText('Filtros'));
    fireEvent.press(await screen.findByLabelText('Todo Madrid'));
    fireEvent.press(screen.getByLabelText('Ver resultados'));

    expect(await screen.findByLabelText('Templo de Debod')).toBeTruthy();
  });

  it('con el permiso sin pedir, tocar "< 1 km" lanza el diálogo y, al concederse, aplica el radio', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');

    locationDouble().__answerNextRequestWith('granted');
    fireEvent.press(await screen.findByLabelText('Filtros'));
    fireEvent.press(await screen.findByLabelText('< 1 km'));
    fireEvent.press(screen.getByLabelText('Ver resultados'));

    // El seguimiento tarda una vuelta de promesas más en arrancar que el
    // propio permiso: reemitir dentro de `waitFor` le da ese margen sin fijar
    // una espera arbitraria.
    await waitFor(() => {
      act(() => {
        locationDouble().__emitPosition(SOL);
      });
      expect(screen.queryByLabelText('Templo de Debod')).toBeNull();
    });
    expect(screen.getByLabelText('Puerta del Sol')).toBeTruthy();
  });

  it('sin permiso, el panel explica que hace falta activar la ubicación', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Filtros'));

    const oneKm = await screen.findByLabelText('< 1 km');
    expect(oneKm.props.accessibilityState.disabled).toBeFalsy();
  });
});
