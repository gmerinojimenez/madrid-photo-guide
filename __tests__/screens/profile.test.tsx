import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { skipOnboarding } from './support.ts';

/**
 * US7 §1 §2 §3 — FR-012, FR-034: la línea de plan es dinámica; la oferta de
 * desbloquear solo aparece sin la compra; las dos filas informativas se
 * muestran sin acción.
 */
describe('Perfil', () => {
  it('en modo prueba, muestra "{free} de {total}" y ofrece desbloquear', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/profile' });

    expect(await screen.findByText(/\d+ de \d+/)).toBeTruthy();
    expect(screen.getByLabelText('Ver la guía completa')).toBeTruthy();
  });

  it('tras comprar, la línea pasa a guía completa con el total y sin oferta de desbloquear', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Ver la guía completa'));
    fireEvent.press(await screen.findByText('Comprar'));
    await screen.findByText(/desbloqueada/i);
    fireEvent.press(screen.getByText('Volver al mapa'));

    fireEvent.press(await screen.findByLabelText('Perfil, tab, 4 of 4'));

    expect(await screen.findByText(/guía completa/i)).toBeTruthy();
    expect(screen.queryByLabelText('Ver la guía completa')).toBeNull();
  });

  it('muestra las dos filas informativas sin acción asociada', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/profile' });

    expect(await screen.findByText('Descarga sin conexión')).toBeTruthy();
    expect(screen.getByText('Restaurar compra')).toBeTruthy();
    expect(screen.queryByText('App de navegación')).toBeNull();
    expect(screen.queryByText('Mi equipo')).toBeNull();
    expect(screen.queryByText('Idioma')).toBeNull();
  });
});
