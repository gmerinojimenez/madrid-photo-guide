import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';
import rawCatalog from '../../src/content/catalog.json';
import { loadCatalog } from '../../src/core/content/catalog.ts';
import { localize } from '../../src/core/content/localize.ts';

/**
 * US2 §4 §5 — FR-030, FR-031: comprar lleva al mapa, abre el panel de compra
 * completada, retira la barra de modo prueba y desbloquea la localización.
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
});
