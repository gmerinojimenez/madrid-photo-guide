import { describe, expect, it } from '@jest/globals';
import { renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

/**
 * US1 §1 — FR-013, FR-014: el mapa renderiza un marcador por cada localización
 * del catálogo, y los accesibles se distinguen de los bloqueados.
 */
describe('Mapa — marcadores', () => {
  it('cada marcador expone el nombre de su localización como etiqueta accesible', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    expect(await screen.findByLabelText('Templo de Debod')).toBeTruthy();
    expect(screen.getByLabelText('Cerro del Tío Pío')).toBeTruthy();
  });
});
