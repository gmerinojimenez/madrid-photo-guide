import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Image } from 'react-native';
import { skipOnboarding } from './support.ts';

/**
 * US2 §1 §2 — FR-010: tocar una localización de pago sin la compra abre el
 * panel de contenido bloqueado, sin revelar coordenadas, EXIF ni descripción.
 */
describe('Panel de contenido bloqueado', () => {
  it('muestra nombre, barrio y zona aproximada, sin coordenadas ni EXIF ni descripción', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Cerro del Tío Pío'));

    expect(await screen.findByText('Cerro del Tío Pío')).toBeTruthy();
    expect(screen.getByText('Vallecas')).toBeTruthy();

    expect(screen.queryByText(/40\.39/)).toBeNull();
    expect(screen.queryByText('Sony A7 IV')).toBeNull();
    expect(screen.queryByText(/dispara con gran angular/)).toBeNull();
  });

  it('muestra la miniatura real de la localización de pago (FR-003)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Cerro del Tío Pío'));
    await screen.findByText('Vallecas');

    const images = screen.UNSAFE_getAllByType(Image);
    const thumb = images.find((image) =>
      String((image.props.source as { testUri?: string } | undefined)?.testUri ?? '').includes(
        'tiopio/thumb',
      ),
    );
    expect(thumb).toBeTruthy();
  });

  it('"Seguir en modo prueba" cierra el panel sin cambiar nada', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Cerro del Tío Pío'));
    await screen.findByText('Vallecas'); // barrio, solo visible dentro del panel

    fireEvent.press(screen.getByText('Seguir en modo prueba'));

    expect(screen.queryByText('Vallecas')).toBeNull();
    expect(screen.getByLabelText('Buscar localizaciones')).toBeTruthy();
  });
});
