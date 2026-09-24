import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Image } from 'react-native';
import { skipOnboarding } from './support.ts';

/**
 * US1 §2 §6 — FR-020, FR-021: tocar una localización gratuita abre su ficha con
 * todos los datos reales del catálogo; la distancia dice "no disponible".
 */
describe('Ficha de localización', () => {
  it('tocar el Templo de Debod abre su ficha con los datos reales del catálogo', async () => {
    await skipOnboarding();
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

  it('la cabecera muestra la fotografía real (detail.jpg), no el bloque de color (FR-001)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    await screen.findByText('Templo de Debod');

    const images = screen.UNSAFE_getAllByType(Image);
    const header = images.find((image) =>
      String((image.props.source as { testUri?: string } | undefined)?.testUri ?? '').includes(
        'debod/detail',
      ),
    );
    expect(header).toBeTruthy();
  });

  it('muestra "Distancia no disponible" en lugar de una distancia (D-012)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    expect(await screen.findByText('Distancia no disponible')).toBeTruthy();
  });

  it('un identificador inexistente muestra "contenido no disponible" con vuelta atrás', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/location/no-existe' });
    expect(await screen.findByText(/contenido no disponible/i)).toBeTruthy();
  });
});
