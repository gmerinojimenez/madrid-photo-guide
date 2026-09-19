import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

/**
 * US1 §2 §6 — FR-020, FR-021: tocar una localización gratuita abre su ficha con
 * todos los datos reales del catálogo; la distancia dice "no disponible".
 */
describe('Ficha de localización', () => {
  it('tocar el Templo de Debod abre su ficha con los datos reales del catálogo', async () => {
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));

    expect(await screen.findByText('Templo de Debod')).toBeTruthy();
    expect(screen.getByText('Argüelles')).toBeTruthy();
    expect(screen.getByText(/45 min antes del atardecer/)).toBeTruthy();
    expect(screen.getByText(/reflejo funciona desde el lado sur/)).toBeTruthy();
    expect(screen.getByText(/tranquilo y muy andable/)).toBeTruthy(); // descripción del barrio
    expect(screen.getByText('Sony A7 IV')).toBeTruthy();
    expect(screen.getByText('40.424000, -3.717660')).toBeTruthy();
  });

  it('muestra "Distancia no disponible" en lugar de una distancia (D-012)', async () => {
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    expect(await screen.findByText('Distancia no disponible')).toBeTruthy();
  });

  it('un identificador inexistente muestra "contenido no disponible" con vuelta atrás', async () => {
    renderRouter('app', { initialUrl: '/location/no-existe' });
    expect(await screen.findByText(/contenido no disponible/i)).toBeTruthy();
  });
});
