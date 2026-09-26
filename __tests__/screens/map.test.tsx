import { describe, expect, it } from '@jest/globals';
import { renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';
import rawCatalog from '../../src/content/catalog.json';
import { loadCatalog } from '../../src/core/content/catalog.ts';
import { localize } from '../../src/core/content/localize.ts';

const loaded = loadCatalog(rawCatalog);
if (loaded.status !== 'ok') throw new Error('catálogo inválido en el fixture de test');
const [freeLocation, premiumLocation] = [
  loaded.catalog.locations.find((l) => l.access === 'free'),
  loaded.catalog.locations.find((l) => l.access === 'premium'),
];
if (!freeLocation || !premiumLocation) {
  throw new Error(
    'el catálogo necesita al menos una localización free y una premium para este test',
  );
}

/**
 * US1 §1 — FR-013, FR-014: el mapa renderiza un marcador por cada localización
 * del catálogo, y los accesibles se distinguen de los bloqueados.
 */
describe('Mapa — marcadores', () => {
  it('cada marcador expone el nombre de su localización como etiqueta accesible', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    expect(await screen.findByLabelText(localize(freeLocation.name, 'es'))).toBeTruthy();
    expect(screen.getByLabelText(localize(premiumLocation.name, 'es'))).toBeTruthy();
  });
});
