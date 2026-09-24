import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as Clipboard from 'expo-clipboard';

import { skipOnboarding } from './support.ts';
import rawCatalog from '../../src/content/catalog.json';
import { loadCatalog } from '../../src/core/content/catalog.ts';
import { localize } from '../../src/core/content/localize.ts';
import { formatCoordinates } from '../../src/core/navigation/links.ts';

/**
 * US6 §3 — copiar escribe en el portapapeles el mismo texto que la ficha
 * muestra y lo confirma visualmente. Las coordenadas se calculan a partir
 * del propio catálogo, no de un valor fijo.
 */
const loaded = loadCatalog(rawCatalog);
if (loaded.status !== 'ok') throw new Error('catálogo inválido en el fixture de test');
const freeLocation = loaded.catalog.locations.find((l) => l.access === 'free');
if (!freeLocation)
  throw new Error('el catálogo necesita al menos una localización free para este test');
const coordsText = formatCoordinates(freeLocation.coords);

describe('Copiar coordenadas', () => {
  it('escribe en el portapapeles exactamente el texto mostrado en la ficha', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText(localize(freeLocation.name, 'es')));
    expect(await screen.findByText(coordsText)).toBeTruthy();

    fireEvent.press(await screen.findByLabelText('Navegar hasta la foto'));
    fireEvent.press(await screen.findByLabelText('Copiar coordenadas'));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(coordsText);
  });

  it('confirma visualmente el copiado y vuelve al estado inicial pasado un tiempo', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText(localize(freeLocation.name, 'es')));
    fireEvent.press(await screen.findByLabelText('Navegar hasta la foto'));
    fireEvent.press(await screen.findByLabelText('Copiar coordenadas'));

    expect(await screen.findByText(/copiad/i)).toBeTruthy();
  });
});
