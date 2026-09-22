import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

function fakePurchases() {
  return require('react-native-purchases') as {
    __seedPurchased: () => void;
    __forceCancelNext: () => void;
  };
}

async function seedOwned(): Promise<void> {
  const sqlite = require('expo-sqlite') as { __seedPreference: (key: string, value: string) => Promise<void> };
  await sqlite.__seedPreference('entitlement.owned', '1');
}

/**
 * Escenarios 1–3 de contracts/screens.md §6 (US1, edge de cancelar).
 */
describe('Flujo de compra', () => {
  it('comprar concede la titularidad, vuelve al mapa y abre la compra completada', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });

    expect(await screen.findByText(/5 de 14 localizaciones/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Cerro del Tío Pío'));
    fireEvent.press(await screen.findByText('Desbloquear'));
    fireEvent.press(await screen.findByText('Comprar'));

    expect(await screen.findByText(/guía.*desbloqueada/i)).toBeTruthy();
    fireEvent.press(screen.getByText('Volver al mapa'));

    // La barra de modo prueba desaparece (FR-017: solo aparece sin la compra).
    expect(screen.queryByText(/5 de 14 localizaciones/)).toBeNull();

    // La localización antes bloqueada ahora abre su ficha completa.
    fireEvent.press(screen.getByLabelText('Cerro del Tío Pío'));
    expect(await screen.findByText('Sony A7 IV')).toBeTruthy();
  });

  it('con titularidad activa, tocar una localización abre su ficha completa sin ofrecer pagar', async () => {
    await skipOnboarding();
    await seedOwned();
    fakePurchases().__seedPurchased();
    renderRouter('app', { initialUrl: '/' });

    fireEvent.press(await screen.findByLabelText('Cerro del Tío Pío'));

    expect(await screen.findByText('Sony A7 IV')).toBeTruthy();
    expect(screen.queryByText('Desbloquear')).toBeNull();
  });

  it('cancelar la compra deja todo bloqueado y no muestra ningún mensaje de error', async () => {
    await skipOnboarding();
    fakePurchases().__forceCancelNext();
    renderRouter('app', { initialUrl: '/' });

    fireEvent.press(await screen.findByLabelText('Cerro del Tío Pío'));
    fireEvent.press(await screen.findByText('Desbloquear'));
    fireEvent.press(await screen.findByText('Comprar'));

    // Sigue en el paywall: el botón de compra sigue disponible.
    await waitFor(() => expect(screen.getByLabelText('Comprar')).not.toBeDisabled());

    // Ningún mensaje de error o fallo aparece tras cancelar.
    expect(screen.queryByText(/no se pudo|no está disponible|no permite/i)).toBeNull();

    // El contenido sigue bloqueado.
    fireEvent.press(screen.getByLabelText('Cerrar'));
    fireEvent.press(screen.getByLabelText('Cerro del Tío Pío'));
    expect(await screen.findByText('Vallecas')).toBeTruthy();
  });
});
