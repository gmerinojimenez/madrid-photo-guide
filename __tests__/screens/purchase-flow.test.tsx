import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

/**
 * US2 §4 §5 — FR-030, FR-031: comprar lleva al mapa, abre el panel de compra
 * completada, retira la barra de modo prueba y desbloquea la localización.
 */
describe('Flujo de compra', () => {
  it('comprar concede la titularidad, vuelve al mapa y abre la compra completada', async () => {
    renderRouter('app', { initialUrl: '/' });

    expect(await screen.findByText(/5 de 14 localizaciones/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Cerro del Tío Pío'));
    fireEvent.press(await screen.findByText('Desbloquear'));
    fireEvent.press(await screen.findByText('Comprar'));

    expect(await screen.findByText(/guía.*desbloqueada/i)).toBeTruthy();
    fireEvent.press(screen.getByText('Volver al mapa'));

    // La barra de modo prueba desaparece (FR-017: solo aparece sin la compra).
    expect(screen.queryByText(/5 de 14 localizaciones/)).toBeNull();

    // La localización antes bloqueada ahora abre su ficha completa.
    fireEvent.press(screen.getByLabelText('Cerro del Tío Pío'));
    expect(await screen.findByText('Sony A7 IV')).toBeTruthy();
  });
});
