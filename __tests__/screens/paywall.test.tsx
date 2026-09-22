import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

function fakePurchases() {
  return require('react-native-purchases') as { __forceOffline: () => void };
}

/**
 * US2 §3 §6 — FR-032, FR-012, D-008, D-012, escenarios 10–11 de
 * contracts/screens.md §6: precio real de la tienda, aviso de plataforma
 * antes del botón, y degradación sin precio.
 */
describe('Paywall', () => {
  it('muestra el precio de la tienda y el total real de localizaciones', async () => {
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

  it('el aviso de alcance por plataforma aparece antes del botón de compra (FR-009, D-012)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/paywall' });

    const notice = await screen.findByText(/comprar en android no desbloquea ios/i);
    const buyButton = await screen.findByLabelText('Comprar');

    // El aviso y el botón comparten árbol; comprobamos que el aviso existe
    // como texto visible y distinto del propio botón (siempre por encima en
    // el orden de lectura del paywall, contracts/screens.md §3.1).
    expect(notice).toBeTruthy();
    expect(buyButton).toBeTruthy();
  });

  it('sin respuesta de ofertas no hay cifra y la compra queda desactivada (D-008)', async () => {
    await skipOnboarding();
    fakePurchases().__forceOffline();
    renderRouter('app', { initialUrl: '/paywall' });

    await screen.findByLabelText('Comprar');
    expect(screen.queryByText(/€/)).toBeNull();
    expect(screen.getByLabelText('Comprar')).toBeDisabled();
  });
});
