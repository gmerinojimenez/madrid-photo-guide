import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { skipOnboarding } from './support.ts';

/**
 * US5 §7 — FR-018: "solo guardados" deja únicamente los marcadores guardados;
 * la distancia se muestra inactiva y marcada como no disponible.
 */
describe('Panel de filtros', () => {
  it('"solo guardados" deja únicamente los marcadores guardados', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Ver la guía completa'));
    fireEvent.press(await screen.findByText('Comprar'));
    await screen.findByText(/desbloqueada/i);
    fireEvent.press(screen.getByText('Volver al mapa'));

    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText('Guardar'));
    await screen.findByLabelText('Guardado'); // espera a que la escritura se complete
    fireEvent.press(screen.getByLabelText('Volver'));

    fireEvent.press(await screen.findByLabelText('Filtros'));
    fireEvent(await screen.findByLabelText('Solo guardados'), 'valueChange', true);
    fireEvent.press(screen.getByLabelText('Ver resultados'));
    await screen.findByLabelText('Buscar localizaciones'); // el fondo vuelve a ser accesible

    expect(await screen.findAllByTestId(/^marker-/)).toHaveLength(1);
    expect(screen.getByLabelText('Templo de Debod')).toBeTruthy();
  });

  it('la distancia se muestra visible pero inactiva y marcada como no disponible', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Filtros'));
    expect(await screen.findByText('Distancia no disponible')).toBeTruthy();
  });
});
