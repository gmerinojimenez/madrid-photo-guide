import { describe, expect, it } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

const TEMPLO_DE_DEBOD = { lat: 40.424069, lng: -3.717613 };

function locationDouble() {
  return require('expo-location') as {
    requestForegroundPermissionsAsync: (...args: unknown[]) => Promise<unknown>;
    __answerNextRequestWith: (state: string) => void;
    __emitPosition: (coords: { lat: number; lng: number }) => void;
  };
}

/**
 * US1 §6, FR-008, SC-004 (feature 004): sin permiso pedido, la ficha no lanza
 * ningún diálogo por sí sola; tocar la fila de distancia sí lo hace, y si se
 * concede, la distancia aparece sin volver a tocar nada.
 */
describe('Ficha de localización — petición contextual de ubicación', () => {
  it('con el permiso sin pedir, abrir la ficha no llama al diálogo del sistema', async () => {
    await skipOnboarding();
    const location = locationDouble();

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));

    expect(await screen.findByText('Distancia no disponible')).toBeTruthy();
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('volver a abrir la misma ficha varias veces nunca lanza el diálogo por sí sola (SC-004)', async () => {
    await skipOnboarding();
    const location = locationDouble();

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    await screen.findByText('Distancia no disponible');
    fireEvent.press(await screen.findByLabelText('Volver'));
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    await screen.findByText('Distancia no disponible');

    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('tocar la fila de distancia lanza el diálogo y, si se concede, la distancia aparece sin volver a tocar', async () => {
    await skipOnboarding();
    const location = locationDouble();
    location.__answerNextRequestWith('granted');

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText(/Distancia no disponible/));

    expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    // Señal de que el permiso ya se resolvió a "concedida" y el seguimiento
    // está activo: el motivo pasa de "sin permiso" a "buscando posición".
    await screen.findByText('Buscando tu posición…');

    act(() => {
      location.__emitPosition(TEMPLO_DE_DEBOD);
    });

    expect(await screen.findByText('0 m')).toBeTruthy();
  });
});
