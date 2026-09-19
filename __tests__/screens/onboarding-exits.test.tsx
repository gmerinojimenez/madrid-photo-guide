import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

/**
 * US3 §4 §5 §6 — FR-005: las cuatro salidas de la tabla R-2 llevan a su
 * destino y todas escriben la marca; con la marca puesta, arranca en el mapa.
 */
describe('Salidas de la presentación (R-2)', () => {
  it('"Saltar" desde el paso 1 lleva al mapa', async () => {
    renderRouter('app', { initialUrl: '/onboarding' });
    fireEvent.press(await screen.findByText('Saltar'));
    expect(await screen.findByLabelText('Buscar localizaciones')).toBeTruthy();
  });

  it('"Empezar gratis" en el paso 3 lleva al mapa', async () => {
    renderRouter('app', { initialUrl: '/onboarding' });
    fireEvent.press(await screen.findByText('Cómo funciona'));
    fireEvent.press(await screen.findByText('Ahora no'));
    fireEvent.press(await screen.findByText('Empezar gratis'));
    expect(await screen.findByLabelText('Buscar localizaciones')).toBeTruthy();
  });

  it('"Ver la guía completa" en el paso 3 lleva al paywall', async () => {
    renderRouter('app', { initialUrl: '/onboarding' });
    fireEvent.press(await screen.findByText('Cómo funciona'));
    fireEvent.press(await screen.findByText('Ahora no'));
    fireEvent.press(await screen.findByText('Ver la guía completa'));
    expect(await screen.findByText('9,99 €')).toBeTruthy();
  });

  it('con la marca de onboarding puesta, la app arranca directamente en el mapa', async () => {
    renderRouter('app', { initialUrl: '/onboarding' });
    fireEvent.press(await screen.findByText('Saltar'));
    await screen.findByLabelText('Buscar localizaciones');

    // Segundo arranque, misma sesión de almacén: la marca ya quedó escrita.
    renderRouter('app', { initialUrl: '/' });
    expect(await screen.findByLabelText('Buscar localizaciones')).toBeTruthy();
  });
});
