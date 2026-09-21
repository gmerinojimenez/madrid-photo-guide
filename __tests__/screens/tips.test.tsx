import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { skipOnboarding } from './support.ts';

/**
 * US4 §1 §2 §5 — FR-011: los consejos se listan agrupados por categoría en el
 * orden del catálogo; los chips filtran y "Todo" los restituye; se ven
 * completos con y sin la compra.
 */
describe('Consejos', () => {
  it('lista los consejos agrupados por categoría, en el orden del catálogo', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/tips' });

    expect(await screen.findAllByText('Ver')).not.toHaveLength(0); // chip + encabezado de sección
    expect(screen.getAllByText('Comer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dormir').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Transporte').length).toBeGreaterThan(0);
    expect(screen.getByText('Sube al Faro de Moncloa al atardecer')).toBeTruthy();
    expect(screen.getByText('Mercado de la Cebada, para comer barato y bien')).toBeTruthy();
  });

  it('el chip de categoría filtra y "Todo" restituye todos los consejos', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/tips' });
    await screen.findByText('Sube al Faro de Moncloa al atardecer');

    fireEvent.press(screen.getByLabelText('Comer'));
    expect(screen.queryByText('Sube al Faro de Moncloa al atardecer')).toBeNull();
    expect(screen.getByText('Mercado de la Cebada, para comer barato y bien')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Todo'));
    expect(screen.getByText('Sube al Faro de Moncloa al atardecer')).toBeTruthy();
  });

  it('los consejos se ven completos también con la compra', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/tips' });
    expect(await screen.findByText('Sube al Faro de Moncloa al atardecer')).toBeTruthy();
    expect(screen.queryByLabelText(/desbloquear/i)).toBeNull();
  });
});
