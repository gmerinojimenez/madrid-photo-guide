import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { Image } from 'react-native';

import { skipOnboarding } from './support.ts';

/**
 * Feature 005 (uncropped-photo-display), Historia de Usuario 1 — FR-001, FR-002,
 * FR-003, FR-008: `/photo-viewer` muestra la imagen resuelta completa; un
 * `locationId`/`usage` inválido cae en "contenido no disponible" en lugar de un
 * crash o una pantalla en blanco; cerrar vuelve a la pantalla de origen.
 */
describe('Visor a pantalla completa', () => {
  it('con locationId/usage válidos, muestra la fotografía real resuelta', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/photo-viewer?locationId=debod&usage=detail' });
    await screen.findByLabelText('Cerrar');

    const images = screen.UNSAFE_getAllByType(Image);
    const found = images.find((image) =>
      String((image.props.source as { testUri?: string } | undefined)?.testUri ?? '').includes(
        'debod/detail',
      ),
    );
    expect(found).toBeTruthy();
  });

  it('con un locationId inexistente, muestra "contenido no disponible" en vez de una pantalla en blanco', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/photo-viewer?locationId=no-existe&usage=thumb' });
    expect(await screen.findByText(/contenido no disponible/i)).toBeTruthy();
  });

  it('con un usage inválido, muestra "contenido no disponible" en vez de lanzar', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/photo-viewer?locationId=debod&usage=no-es-un-usage' });
    expect(await screen.findByText(/contenido no disponible/i)).toBeTruthy();
  });

  it('cerrar el visor vuelve a la ficha desde la que se abrió', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/location/debod' });
    fireEvent.press(await screen.findByLabelText('Ver foto completa'));

    expect(await screen.findByLabelText('Cerrar')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Cerrar'));

    expect(await screen.findByText('Templo de Debod')).toBeTruthy();
  });

  it('cerrar el visor con el botón atrás del sistema también vuelve a la pantalla de origen', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/location/debod' });
    fireEvent.press(await screen.findByLabelText('Ver foto completa'));
    await screen.findByLabelText('Cerrar');

    testRouter.back();

    expect(await screen.findByText('Templo de Debod')).toBeTruthy();
  });
});
