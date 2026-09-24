import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { Image } from 'react-native';

import { skipOnboarding } from './support.ts';

/**
 * US4 §3 §4, R-4 — el detalle muestra categoría, título, cuerpo y
 * relacionadas; tocar una aplica R-3; volver atrás devuelve al consejo.
 */
describe('Detalle de consejo', () => {
  it('muestra categoría, título, cuerpo completo y localizaciones relacionadas', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/tip/faro' });

    expect(await screen.findByText('Sube al Faro de Moncloa al atardecer')).toBeTruthy();
    expect(screen.getByText('Ver')).toBeTruthy();
    expect(screen.getByText(/mirador más rápido de Madrid/)).toBeTruthy();
    expect(screen.getByText(/El cristal refleja/)).toBeTruthy();
    expect(screen.getByLabelText('Templo de Debod')).toBeTruthy();
  });

  it('la tarjeta de una localización relacionada muestra su miniatura real (FR-002)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/tip/faro' });
    await screen.findByLabelText('Templo de Debod');

    const images = screen.UNSAFE_getAllByType(Image);
    const thumb = images.find((image) =>
      String((image.props.source as { testUri?: string } | undefined)?.testUri ?? '').includes(
        'debod/thumb',
      ),
    );
    expect(thumb).toBeTruthy();
  });

  it('un identificador de consejo inexistente muestra contenido no disponible', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/tip/no-existe' });
    expect(await screen.findByText(/contenido no disponible/i)).toBeTruthy();
  });

  it('tocar una localización relacionada accesible abre su ficha (R-3)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/tip/faro' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    expect(await screen.findByText('Sony A7 IV')).toBeTruthy();
  });

  it('volver atrás desde la ficha abierta aquí devuelve al consejo, no al mapa', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/tip/faro' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    await screen.findByText('Sony A7 IV');

    testRouter.back();

    expect(await screen.findByText('Sube al Faro de Moncloa al atardecer')).toBeTruthy();
  });
});
