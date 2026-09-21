import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import { skipOnboarding } from './support.ts';

/**
 * US6 §1 §2 — el panel ofrece Google Maps, Apple Maps y copiar, con las
 * coordenadas a la vista; elegir una app entrega la URL exacta a Linking.
 */
describe('Panel de navegación', () => {
  it('muestra las coordenadas y las tres opciones', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText('Navegar hasta la foto'));

    expect(await screen.findByText('40.424000, -3.717660')).toBeTruthy();
    expect(screen.getByLabelText('Abrir en Google Maps')).toBeTruthy();
    expect(screen.getByLabelText('Abrir en Apple Maps')).toBeTruthy();
    expect(screen.getByLabelText('Copiar coordenadas')).toBeTruthy();
  });

  it('elegir Google Maps entrega a Linking.openURL la URL exacta de esa localización', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText('Navegar hasta la foto'));
    fireEvent.press(await screen.findByLabelText('Abrir en Google Maps'));

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=40.424000%2C-3.717660',
    );
  });

  it('elegir Apple Maps entrega a Linking.openURL la URL exacta de esa localización', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText('Navegar hasta la foto'));
    fireEvent.press(await screen.findByLabelText('Abrir en Apple Maps'));

    expect(Linking.openURL).toHaveBeenCalledWith('https://maps.apple.com/?ll=40.424000%2C-3.717660');
  });

  it('solo es alcanzable desde una ficha, es decir, para localizaciones accesibles', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Cerro del Tío Pío'));
    expect(await screen.findByText('Vallecas')).toBeTruthy();
    expect(screen.queryByLabelText('Navegar hasta la foto')).toBeNull();
  });
});
