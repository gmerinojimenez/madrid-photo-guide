import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen, testRouter } from 'expo-router/testing-library';

import { skipOnboarding } from './support.ts';
import rawCatalog from '../../src/content/catalog.json';
import { loadCatalog } from '../../src/core/content/catalog.ts';
import { localize } from '../../src/core/content/localize.ts';

/**
 * US4 §3 §4, R-4 — el detalle muestra categoría, título, cuerpo y
 * relacionadas; tocar una aplica R-3; volver atrás devuelve al consejo.
 *
 * El tip y la localización relacionada se leen del catálogo real: lo que se
 * comprueba es que la pantalla pinta lo que hay en el dato (y navega bien),
 * no un texto concreto que deje de ser cierto en cuanto cambie el contenido.
 */
const loaded = loadCatalog(rawCatalog);
if (loaded.status !== 'ok') throw new Error('catálogo inválido en el fixture de test');
const catalog = loaded.catalog;
const tip = catalog.tips.find((t) => {
  const firstRelated = catalog.locations.find((l) => l.id === t.relatedLocationIds?.[0]);
  return firstRelated?.access === 'free';
});
if (!tip)
  throw new Error('el catálogo necesita un tip cuya primera localización relacionada sea free');
const category = catalog.tipCategories.find((c) => c.id === tip.categoryId);
const relatedLocation = catalog.locations.find((l) => l.id === tip.relatedLocationIds![0])!;

describe('Detalle de consejo', () => {
  it('muestra categoría, título, cuerpo completo y localizaciones relacionadas', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: `/tip/${tip.id}` });

    expect(await screen.findByText(localize(tip.title, 'es'))).toBeTruthy();
    if (category) expect(screen.getByText(localize(category.label, 'es'))).toBeTruthy();
    for (const paragraph of tip.body) {
      expect(screen.getByText(localize(paragraph, 'es'))).toBeTruthy();
    }
    expect(screen.getByLabelText(localize(relatedLocation.name, 'es'))).toBeTruthy();
  });

  it('un identificador de consejo inexistente muestra contenido no disponible', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/tip/no-existe' });
    expect(await screen.findByText(/contenido no disponible/i)).toBeTruthy();
  });

  it('tocar una localización relacionada accesible abre su ficha (R-3)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: `/tip/${tip.id}` });
    fireEvent.press(await screen.findByLabelText(localize(relatedLocation.name, 'es')));
    // "La toma" solo se pinta en la ficha completa (nunca en el panel bloqueado):
    // confirma que se abrió la pantalla de detalle, no solo que existe el botón.
    expect(await screen.findByText('La toma')).toBeTruthy();
  });

  it('volver atrás desde la ficha abierta aquí devuelve al consejo, no al mapa', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: `/tip/${tip.id}` });
    fireEvent.press(await screen.findByLabelText(localize(relatedLocation.name, 'es')));
    await screen.findByText('La toma');

    testRouter.back();

    expect(await screen.findByText(localize(tip.title, 'es'))).toBeTruthy();
  });
});
