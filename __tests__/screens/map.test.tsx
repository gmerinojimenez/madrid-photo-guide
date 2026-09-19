import { describe, expect, it } from '@jest/globals';
import { renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

/**
 * US1 §1 — FR-013, FR-014: el mapa renderiza un marcador por cada localización
 * del catálogo, y los accesibles se distinguen de los bloqueados.
 */
describe('Mapa — marcadores', () => {
  it('renderiza un marcador por cada una de las 14 localizaciones del catálogo', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    const markers = await screen.findAllByTestId(/^marker-/);
    expect(markers).toHaveLength(14);
  });

  it('distingue los 5 marcadores accesibles de los 9 bloqueados (sin la compra)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findAllByTestId(/^marker-/);
    expect(screen.getAllByTestId(/^marker-.*-open$/)).toHaveLength(5);
    expect(screen.getAllByTestId(/^marker-.*-locked$/)).toHaveLength(9);
  });

  it('cada marcador expone el nombre de su localización como etiqueta accesible', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    expect(await screen.findByLabelText('Templo de Debod')).toBeTruthy();
    expect(screen.getByLabelText('Cerro del Tío Pío')).toBeTruthy();
  });
});
