import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { renderedLocationIds, skipOnboarding } from './support.ts';
import rawCatalog from '../../src/content/catalog.json';
import { loadCatalog } from '../../src/core/content/catalog.ts';
import { queryLocations } from '../../src/core/content/query.ts';
import { localize } from '../../src/core/content/localize.ts';

/**
 * US1 §4 §5 — FR-015, FR-016, FR-019: el buscador filtra por nombre, barrio y
 * etiqueta ignorando mayúsculas y acentos; los chips de tipo filtran; los
 * criterios se componen; sin resultados se informa.
 *
 * Las expectativas se calculan con `queryLocations` (el mismo núcleo que usa
 * la pantalla) en lugar de contarlas o nombrarlas a mano: así el test sigue
 * probando el filtrado real sin quedar atado a qué localizaciones concretas
 * trae el catálogo en cada momento.
 */
const loaded = loadCatalog(rawCatalog);
if (loaded.status !== 'ok') throw new Error('catálogo inválido en el fixture de test');
const catalog = loaded.catalog;

function expectedIdsFor(query: Parameters<typeof queryLocations>[1]): string[] {
  return queryLocations(catalog, query)
    .map((location) => location.id)
    .sort();
}

// Un barrio real del catálogo cuyo nombre lleva una tilde/diéresis y que
// tiene al menos una localización — para probar que buscar con y sin acento
// da el mismo resultado, sin fijar de antemano cuál es ese barrio.
function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
const accentedNeighbourhood = catalog.neighbourhoods.find((n) => {
  const name = localize(n.name, 'es');
  return (
    name !== stripDiacritics(name) &&
    catalog.locations.some((location) => location.neighbourhoodId === n.id)
  );
});
if (!accentedNeighbourhood) {
  throw new Error(
    'el catálogo necesita al menos un barrio acentuado con localizaciones para este test',
  );
}
const accentedName = localize(accentedNeighbourhood.name, 'es');

// Cualquier tag con al menos una localización sirve para probar el chip.
const sampleTag = catalog.tags.find((tag) =>
  catalog.locations.some((location) => location.tagIds.includes(tag.id)),
);
if (!sampleTag) throw new Error('el catálogo necesita al menos un tag en uso para este test');
const sampleTagLabel = localize(sampleTag.label, 'es');

describe('Mapa — búsqueda y filtros', () => {
  it('buscar por nombre deja solo las localizaciones que coinciden', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    const input = await screen.findByLabelText('Buscar localizaciones');
    fireEvent.changeText(input, 'debod');
    await screen.findAllByTestId(/^marker-/);
    expect(renderedLocationIds()).toEqual(expectedIdsFor({ text: 'debod' }));
  });

  it('buscar con y sin acento por barrio filtra igual', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    const input = await screen.findByLabelText('Buscar localizaciones');

    fireEvent.changeText(input, accentedName);
    await screen.findAllByTestId(/^marker-/);
    const withAccent = renderedLocationIds();

    fireEvent.changeText(input, stripDiacritics(accentedName));
    await screen.findAllByTestId(/^marker-/);
    const withoutAccent = renderedLocationIds();

    expect(withoutAccent).toEqual(withAccent);
    expect(withAccent).toEqual(expectedIdsFor({ text: accentedName }));
  });

  it('seleccionar un chip de etiqueta filtra a las localizaciones con esa etiqueta', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findAllByTestId(/^marker-/);
    fireEvent.press(screen.getByText(sampleTagLabel));
    await screen.findAllByTestId(/^marker-/);
    expect(renderedLocationIds()).toEqual(expectedIdsFor({ tagId: sampleTag.id }));
  });

  it('los criterios de búsqueda y chip se componen', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    const input = await screen.findByLabelText('Buscar localizaciones');
    fireEvent.press(screen.getByText(sampleTagLabel));
    fireEvent.changeText(input, 'debod');
    await screen.findAllByTestId(/^marker-/);
    expect(renderedLocationIds()).toEqual(expectedIdsFor({ tagId: sampleTag.id, text: 'debod' }));
  });

  it('el chip "Todo" no filtra: restituye todas las localizaciones', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findAllByTestId(/^marker-/);
    fireEvent.press(screen.getByText(sampleTagLabel));
    await screen.findAllByTestId(/^marker-/);
    fireEvent.press(screen.getByText('Todo'));
    await screen.findAllByTestId(/^marker-/);
    expect(renderedLocationIds()).toEqual(catalog.locations.map((location) => location.id).sort());
  });

  it('sin resultados, se informa en lugar de dejar el mapa mudo', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    const input = await screen.findByLabelText('Buscar localizaciones');
    fireEvent.changeText(input, 'no-existe-ninguna-localizacion-con-este-texto');
    expect(await screen.findByText(/sin resultados/i)).toBeTruthy();
  });
});
