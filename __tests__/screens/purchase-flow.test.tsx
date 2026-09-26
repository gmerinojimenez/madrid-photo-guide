import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';
import rawCatalog from '../../src/content/catalog.json';
import { loadCatalog } from '../../src/core/content/catalog.ts';
import { localize } from '../../src/core/content/localize.ts';

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
const loaded = loadCatalog(rawCatalog);
if (loaded.status !== 'ok') throw new Error('catálogo inválido en el fixture de test');
const catalog = loaded.catalog;
const premiumLocation = catalog.locations.find((l) => l.access === 'premium');
if (!premiumLocation)
  throw new Error('el catálogo necesita al menos una localización premium para este test');

describe('Flujo de compra', () => {
  it('comprar concede la titularidad, vuelve al mapa y abre la compra completada', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });

    // Barra de modo prueba (FR-017): visible sin la compra, con un patrón
    // "{free} de {total}" en lugar de un número fijo.
    expect(await screen.findByText(/\d+ de \d+ localizaciones/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText(localize(premiumLocation.name, 'es')));
    fireEvent.press(await screen.findByText('Desbloquear'));
    fireEvent.press(await screen.findByText('Comprar'));

    expect(await screen.findByText(/guía.*desbloqueada/i)).toBeTruthy();
    fireEvent.press(screen.getByText('Volver al mapa'));

    // La barra de modo prueba desaparece (FR-017: solo aparece sin la compra).
    expect(screen.queryByText(/\d+ de \d+ localizaciones/)).toBeNull();

    // La localización antes bloqueada ahora abre su ficha completa: "La toma"
    // solo se pinta ahí, nunca en el panel bloqueado.
    fireEvent.press(screen.getByLabelText(localize(premiumLocation.name, 'es')));
    expect(await screen.findByText('La toma')).toBeTruthy();
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
