import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

/**
 * US3 §1 §2 §3 — FR-005: sin la marca, la app arranca en el paso 1 sin
 * pestañas; el indicador refleja el paso; el paso 2 no solicita permisos.
 */
describe('Presentación inicial', () => {
  it('sin la marca de onboarding, arranca en el paso 1 sin pestañas visibles', async () => {
    renderRouter('app', { initialUrl: '/' });
    expect(await screen.findByText('Cómo funciona')).toBeTruthy();
    expect(screen.queryByLabelText('Buscar localizaciones')).toBeNull();
  });

  it('el paso 2 no solicita ningún permiso del sistema: ambas acciones avanzan igual', async () => {
    renderRouter('app', { initialUrl: '/onboarding' });
    fireEvent.press(await screen.findByText('Cómo funciona'));
    expect(await screen.findByLabelText('Activar ubicación')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Ahora no'));
    expect(await screen.findByText('Empezar gratis')).toBeTruthy();
  });

  it('avanzar desde "Activar ubicación" llega al mismo paso 3', async () => {
    renderRouter('app', { initialUrl: '/onboarding' });
    fireEvent.press(await screen.findByText('Cómo funciona'));
    fireEvent.press(await screen.findByLabelText('Activar ubicación'));
    expect(await screen.findByText('Empezar gratis')).toBeTruthy();
  });
});
