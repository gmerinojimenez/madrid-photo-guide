import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { skipOnboarding } from './support.ts';

/**
 * US5 §1 §2 §6 — FR-024, FR-027: guardar y desguardar desde la ficha; sin la
 * compra no se guarda nada y se ofrece desbloquear.
 */
describe('Guardar desde la ficha', () => {
  it('sin la compra, el control de guardar ofrece desbloquear en lugar de guardar', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText('Guardar'));

    expect(await screen.findByText('9,99 €')).toBeTruthy();
  });

  it('con la compra, guardar y desguardar alternan el estado del control', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Ver la guía completa'));
    fireEvent.press(await screen.findByText('Comprar'));
    await screen.findByText(/desbloqueada/i);
    fireEvent.press(screen.getByText('Volver al mapa'));

    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText('Guardar'));
    expect(await screen.findByLabelText('Guardado')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Guardado'));
    expect(await screen.findByLabelText('Guardar')).toBeTruthy();
  });
});
