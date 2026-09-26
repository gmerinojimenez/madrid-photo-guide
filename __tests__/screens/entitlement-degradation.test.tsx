import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

function fakePurchases() {
  return require('react-native-purchases') as {
    __seedPurchased: () => void;
    __forceOffline: () => void;
    __forceStoreFailure: () => void;
    __pushRevocation: () => void;
  };
}

async function seedOwnedCache(): Promise<void> {
  const sqlite = require('expo-sqlite') as { __seedPreference: (key: string, value: string) => Promise<void> };
  await sqlite.__seedPreference('entitlement.owned', '1');
}

/**
 * US3, escenarios 7–9 de contracts/screens.md §6: arranque sin red
 * conservando el acceso, reconciliación fallida que no revoca, y reembolso
 * que sí vuelve a bloquear. Cierra la deuda de la feature 003 sobre las
 * cuatro situaciones de acceso del principio III.
 */
describe('Degradación de la titularidad', () => {
  it('arranque sin red: con caché "1" y la tienda muda, el contenido premium sigue accesible', async () => {
    await skipOnboarding();
    await seedOwnedCache();
    fakePurchases().__forceOffline();
    renderRouter('app', { initialUrl: '/' });

    fireEvent.press(await screen.findByLabelText('Cerro del Tío Pío'));
    expect(await screen.findByText('Sony A7 IV')).toBeTruthy();
  });

  it('reconciliación fallida por error de tienda: el acceso no se revoca', async () => {
    await skipOnboarding();
    await seedOwnedCache();
    fakePurchases().__forceStoreFailure();
    renderRouter('app', { initialUrl: '/' });

    fireEvent.press(await screen.findByLabelText('Cerro del Tío Pío'));
    expect(await screen.findByText('Sony A7 IV')).toBeTruthy();
  });

  it('un reembolso empujado por la tienda vuelve a bloquear el contenido', async () => {
    await skipOnboarding();
    await seedOwnedCache();
    fakePurchases().__seedPurchased();
    renderRouter('app', { initialUrl: '/' });

    // Confirma que arrancó desbloqueada antes del reembolso.
    fireEvent.press(await screen.findByLabelText('Cerro del Tío Pío'));
    expect(await screen.findByText('Sony A7 IV')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Volver'));

    fakePurchases().__pushRevocation();

    // La barra de modo prueba reaparece: el reembolso revocó el acceso.
    expect(await screen.findByText(/\d+ de \d+ localizaciones/)).toBeTruthy();
  });
});
