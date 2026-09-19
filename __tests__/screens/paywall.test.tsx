import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

/**
 * US2 §3 §6 — FR-032, FR-012: el paywall muestra 9,99 € y el total real del
 * catálogo; cerrarlo sin comprar devuelve a la pantalla anterior con la
 * titularidad intacta.
 */
describe('Paywall', () => {
  it('muestra el precio fijo y el total real de localizaciones', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/paywall' });
    expect(await screen.findByText('9,99 €')).toBeTruthy();
    expect(screen.getByText(/14/)).toBeTruthy();
  });

  it('cerrar sin comprar vuelve al mapa sin conceder la titularidad', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Cerro del Tío Pío'));
    fireEvent.press(await screen.findByText('Desbloquear'));

    expect(await screen.findByText('9,99 €')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Cerrar'));

    expect(await screen.findByLabelText('Buscar localizaciones')).toBeTruthy();
    // Sin titularidad: tocar la misma localización vuelve a abrir el panel bloqueado.
    fireEvent.press(screen.getByLabelText('Cerro del Tío Pío'));
    expect(await screen.findByText('Vallecas')).toBeTruthy();
  });
});
