import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

/**
 * FR-028 — con el almacén en modo "siempre falla", la app arranca mostrando
 * la presentación (una preferencia ilegible se trata como no completada,
 * D-005) y la lista de guardados queda vacía, sin lanzar.
 */
describe('Degradación del almacenamiento', () => {
  it('arranca en la presentación y no lanza cuando la base de datos no puede leerse', async () => {
    const sqlite = require('expo-sqlite') as { __breakDatabase: (name: string) => void };
    sqlite.__breakDatabase('madrid-photo-guide.db');

    expect(() => renderRouter('app', { initialUrl: '/' })).not.toThrow();
    expect(await screen.findByText('Cómo funciona')).toBeTruthy();
  });

  it('con el almacén roto, la lista de guardados queda vacía en lugar de fallar', async () => {
    const sqlite = require('expo-sqlite') as { __breakDatabase: (name: string) => void };
    sqlite.__breakDatabase('madrid-photo-guide.db');

    renderRouter('app', { initialUrl: '/onboarding' });
    fireEvent.press(await screen.findByText('Saltar'));

    fireEvent.press(await screen.findByLabelText('Guardados, tab, 3 of 4'));
    expect(await screen.findByLabelText('Ver la guía completa')).toBeTruthy();
  });
});
