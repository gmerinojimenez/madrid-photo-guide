import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Image } from 'react-native';
import { skipOnboarding } from './support.ts';
import rawCatalog from '../../src/content/catalog.json';
import { loadCatalog } from '../../src/core/content/catalog.ts';
import { localize } from '../../src/core/content/localize.ts';
import { formatCoordinates } from '../../src/core/navigation/links.ts';

/**
 * US1 §2 §6 — FR-020, FR-021: tocar una localización gratuita abre su ficha con
 * todos los datos reales del catálogo; la distancia dice "no disponible".
 *
 * Los valores esperados se leen del propio catálogo en lugar de fijarse a
 * mano: el test comprueba que la pantalla pinta lo que hay en el dato, no un
 * texto concreto que deje de ser cierto en cuanto cambie el contenido.
 */
const loaded = loadCatalog(rawCatalog);
if (loaded.status !== 'ok') throw new Error('catálogo inválido en el fixture de test');
const catalog = loaded.catalog;
const freeLocation = catalog.locations.find(
  (l) => l.access === 'free' && l.bestTime && l.capture?.camera,
);
if (!freeLocation) {
  throw new Error(
    'el catálogo necesita una localización free con bestTime y capture.camera para este test',
  );
}
const neighbourhood = catalog.neighbourhoods.find((n) => n.id === freeLocation.neighbourhoodId);

describe('Ficha de localización', () => {
  it('tocar una localización gratuita abre su ficha con los datos reales del catálogo', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText(localize(freeLocation.name, 'es')));

    expect(await screen.findByText(localize(freeLocation.name, 'es'))).toBeTruthy();
    if (neighbourhood) {
      expect(screen.getByText(localize(neighbourhood.name, 'es'))).toBeTruthy();
    }
    expect(screen.getByText(localize(freeLocation.bestTime!, 'es'))).toBeTruthy();
    expect(screen.getByText(localize(freeLocation.shotDescription, 'es'))).toBeTruthy();
    if (neighbourhood?.description) {
      expect(screen.getByText(localize(neighbourhood.description, 'es'))).toBeTruthy();
    }
    expect(screen.getByText(freeLocation.capture!.camera!)).toBeTruthy();
    expect(screen.getByText(formatCoordinates(freeLocation.coords))).toBeTruthy();
  });

  it('la cabecera muestra la fotografía real (detail.jpg), no el bloque de color (FR-001)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    await screen.findByText('Templo de Debod');

    const images = screen.UNSAFE_getAllByType(Image);
    const header = images.find((image) =>
      String((image.props.source as { testUri?: string } | undefined)?.testUri ?? '').includes(
        'debod/detail',
      ),
    );
    expect(header).toBeTruthy();
  });

  it('muestra "Distancia no disponible" en lugar de una distancia (D-012)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText(localize(freeLocation.name, 'es')));
    expect(await screen.findByText('Distancia no disponible')).toBeTruthy();
  });

  it('un identificador inexistente muestra "contenido no disponible" con vuelta atrás', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/location/no-existe' });
    expect(await screen.findByText(/contenido no disponible/i)).toBeTruthy();
  });
});
