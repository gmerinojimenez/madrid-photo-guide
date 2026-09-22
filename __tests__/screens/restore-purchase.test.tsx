import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

function fakePurchases() {
  return require('react-native-purchases') as {
    __seedPurchasedElsewhere: () => void;
    __forceOffline: () => void;
  };
}

/**
 * US2 §1–3, escenarios 4–6 de contracts/screens.md §6: restaurar en
 * instalación limpia, nada que restaurar, y el caso entre plataformas (que
 * llega como `nothing-to-restore` con un mensaje que explica el alcance).
 */
describe('Restaurar compra', () => {
  it('restaurar en instalación limpia desbloquea el contenido (perfil)', async () => {
    await skipOnboarding();
    fakePurchases().__seedPurchasedElsewhere();
    renderRouter('app', { initialUrl: '/profile' });

    fireEvent.press(await screen.findByLabelText('Restaurar compra'));

    expect(await screen.findByText(/compra restaurada/i)).toBeTruthy();
    expect(await screen.findByText('Guía completa')).toBeTruthy();
  });

  it('sin nada que restaurar, el mensaje es claro y no desbloquea nada (perfil)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/profile' });

    expect(await screen.findByText('Modo prueba')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Restaurar compra'));

    expect(await screen.findByText(/no se ha encontrado ninguna compra/i)).toBeTruthy();
    expect(screen.getByText('Modo prueba')).toBeTruthy();
  });

  it('el caso de otra plataforma llega como "nada que restaurar" con mensaje que explica el alcance (paywall)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/paywall' });

    fireEvent.press(await screen.findByLabelText('Restaurar compra'));

    expect(await screen.findByText(/plataforma donde se compró/i)).toBeTruthy();
  });

  it('un fallo de la tienda al restaurar no toca el acceso vigente', async () => {
    await skipOnboarding();
    fakePurchases().__forceOffline();
    renderRouter('app', { initialUrl: '/profile' });

    expect(await screen.findByText('Modo prueba')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Restaurar compra'));

    expect(await screen.findByText(/no se pudo contactar con la tienda/i)).toBeTruthy();
    expect(screen.getByText('Modo prueba')).toBeTruthy();
  });
});
