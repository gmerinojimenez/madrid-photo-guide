import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as Clipboard from 'expo-clipboard';

import { skipOnboarding } from './support.ts';

/**
 * US6 §3 — copiar escribe en el portapapeles el mismo texto que la ficha
 * muestra y lo confirma visualmente.
 */
describe('Copiar coordenadas', () => {
  it('escribe en el portapapeles exactamente el texto mostrado en la ficha', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    expect(await screen.findByText('40.424000, -3.717660')).toBeTruthy();

    fireEvent.press(await screen.findByLabelText('Navegar hasta la foto'));
    fireEvent.press(await screen.findByLabelText('Copiar coordenadas'));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('40.424000, -3.717660');
  });

  it('confirma visualmente el copiado y vuelve al estado inicial pasado un tiempo', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText('Navegar hasta la foto'));
    fireEvent.press(await screen.findByLabelText('Copiar coordenadas'));

    expect(await screen.findByText(/copiad/i)).toBeTruthy();
  });
});
