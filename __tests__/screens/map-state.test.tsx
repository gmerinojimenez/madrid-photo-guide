import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

/**
 * US1 §3 — FR-002: abrir una ficha y volver atrás conserva la pestaña activa,
 * el texto buscado y el chip seleccionado.
 */
describe('Mapa — conservación de estado', () => {
  it('conserva el texto buscado, el chip y la sección tras abrir y cerrar una ficha', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });

    const input = await screen.findByLabelText('Buscar localizaciones');
    fireEvent.changeText(input, 'debod');
    fireEvent.press(screen.getByText('Atardecer'));
    await screen.findAllByTestId(/^marker-/);

    fireEvent.press(screen.getByLabelText('Templo de Debod'));
    expect(await screen.findByText('Distancia no disponible')).toBeTruthy();

    testRouter.back();

    expect(await screen.findByLabelText('Buscar localizaciones')).toHaveProp('value', 'debod');
    expect(screen.getByLabelText('Atardecer').props.accessibilityState.selected).toBe(true);
  });
});
