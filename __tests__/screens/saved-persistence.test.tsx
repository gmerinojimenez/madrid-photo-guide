import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { skipOnboarding } from './support.ts';

/**
 * US5 §3 — FR-025: los guardados sobreviven a un remontaje completo del árbol
 * de rutas (persistencia real en SQLite, no solo en memoria de componente).
 */
describe('Guardados — persistencia', () => {
  it('un guardado hecho antes de remontar la app sigue presente después', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Ver la guía completa'));
    fireEvent.press(await screen.findByText('Comprar'));
    await screen.findByText(/desbloqueada/i);
    fireEvent.press(screen.getByText('Volver al mapa'));

    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText('Guardar'));
    await screen.findByLabelText('Guardado');

    // Remontaje completo: nueva instancia del árbol de rutas sobre la misma
    // base de datos. Lo que se comprueba es el guardado, en SQLite.
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');

    fireEvent.press(await screen.findByLabelText('Guardados, tab, 3 of 4'));
    expect(await screen.findByLabelText('Templo de Debod')).toBeTruthy();
  });
});
