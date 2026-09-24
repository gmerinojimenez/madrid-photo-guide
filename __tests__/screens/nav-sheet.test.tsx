import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import { skipOnboarding } from './support.ts';
import rawCatalog from '../../src/content/catalog.json';
import { loadCatalog } from '../../src/core/content/catalog.ts';
import { localize } from '../../src/core/content/localize.ts';
import { appleMapsUrl, formatCoordinates, googleMapsUrl } from '../../src/core/navigation/links.ts';

/**
 * US6 §1 §2 — el panel ofrece Google Maps, Apple Maps y copiar, con las
 * coordenadas a la vista; elegir una app entrega la URL exacta a Linking.
 * Coordenadas y URLs se derivan del catálogo real con las mismas funciones
 * que usa la app, para no fijar un punto concreto de Madrid en el test.
 */
const loaded = loadCatalog(rawCatalog);
if (loaded.status !== 'ok') throw new Error('catálogo inválido en el fixture de test');
const catalog = loaded.catalog;
const freeLocation = catalog.locations.find((l) => l.access === 'free');
const premiumLocation = catalog.locations.find((l) => l.access === 'premium');
if (!freeLocation || !premiumLocation) {
  throw new Error(
    'el catálogo necesita al menos una localización free y una premium para este test',
  );
}

describe('Panel de navegación', () => {
  it('muestra las coordenadas y las tres opciones', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText(localize(freeLocation.name, 'es')));
    fireEvent.press(await screen.findByLabelText('Navegar hasta la foto'));

    expect(await screen.findByText(formatCoordinates(freeLocation.coords))).toBeTruthy();
    expect(screen.getByLabelText('Abrir en Google Maps')).toBeTruthy();
    expect(screen.getByLabelText('Abrir en Apple Maps')).toBeTruthy();
    expect(screen.getByLabelText('Copiar coordenadas')).toBeTruthy();
  });

  it('elegir Google Maps entrega a Linking.openURL la URL exacta de esa localización', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText(localize(freeLocation.name, 'es')));
    fireEvent.press(await screen.findByLabelText('Navegar hasta la foto'));
    fireEvent.press(await screen.findByLabelText('Abrir en Google Maps'));

    expect(Linking.openURL).toHaveBeenCalledWith(googleMapsUrl(freeLocation.coords));
  });

  it('elegir Apple Maps entrega a Linking.openURL la URL exacta de esa localización', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText(localize(freeLocation.name, 'es')));
    fireEvent.press(await screen.findByLabelText('Navegar hasta la foto'));
    fireEvent.press(await screen.findByLabelText('Abrir en Apple Maps'));

    expect(Linking.openURL).toHaveBeenCalledWith(appleMapsUrl(freeLocation.coords));
  });

  it('solo es alcanzable desde una ficha, es decir, para localizaciones accesibles', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText(localize(premiumLocation.name, 'es')));
    expect(await screen.findByText('Coordenadas exactas')).toBeTruthy();
    expect(screen.queryByLabelText('Navegar hasta la foto')).toBeNull();
  });
});
