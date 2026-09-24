import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';
import rawCatalog from '../../src/content/catalog.json';
import { loadCatalog } from '../../src/core/content/catalog.ts';
import { localize } from '../../src/core/content/localize.ts';

/**
 * US2 §3 §6 — FR-032, FR-012: el paywall muestra 9,99 € y el total real del
 * catálogo; cerrarlo sin comprar devuelve a la pantalla anterior con la
 * titularidad intacta.
 */
const loaded = loadCatalog(rawCatalog);
if (loaded.status !== 'ok') throw new Error('catálogo inválido en el fixture de test');
const catalog = loaded.catalog;
const premiumLocation = catalog.locations.find((l) => l.access === 'premium');
if (!premiumLocation)
  throw new Error('el catálogo necesita al menos una localización premium para este test');

describe('Paywall', () => {
  it('muestra el precio fijo y el total real de localizaciones', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/paywall' });
    expect(await screen.findByText('9,99 €')).toBeTruthy();
    expect(screen.getByText(new RegExp(String(catalog.locations.length)))).toBeTruthy();
  });

  it('cerrar sin comprar vuelve al mapa sin conceder la titularidad', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText(localize(premiumLocation.name, 'es')));
    fireEvent.press(await screen.findByText('Desbloquear'));

    expect(await screen.findByText('9,99 €')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Cerrar'));

    expect(await screen.findByLabelText('Buscar localizaciones')).toBeTruthy();
    // Sin titularidad: tocar la misma localización vuelve a abrir el panel bloqueado.
    fireEvent.press(screen.getByLabelText(localize(premiumLocation.name, 'es')));
    expect(await screen.findByText('Coordenadas exactas')).toBeTruthy();
  });
});
