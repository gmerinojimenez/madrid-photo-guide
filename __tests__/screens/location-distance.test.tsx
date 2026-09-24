import { describe, expect, it } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

// Coordenadas exactas del Templo de Debod en el catálogo (ver location-detail.test.tsx).
const TEMPLO_DE_DEBOD = { lat: 40.424, lng: -3.71766 };

function locationDouble() {
  return require('expo-location') as {
    __setLocationPermission: (state: string) => void;
    __emitPosition: (coords: { lat: number; lng: number }) => void;
  };
}

/**
 * US1 §3 §4 §5 (feature 004): con el permiso concedido, la ficha muestra la
 * distancia real, marcada como aproximada si corresponde, y se actualiza en
 * vivo al desplazarse.
 */
describe('Ficha de localización — distancia real', () => {
  it('con permiso concedido y posición, muestra la distancia en lugar de "no disponible"', async () => {
    await skipOnboarding();
    locationDouble().__setLocationPermission('granted');

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    await screen.findByText('Templo de Debod');

    act(() => {
      locationDouble().__emitPosition(TEMPLO_DE_DEBOD);
    });

    expect(await screen.findByText('0 m')).toBeTruthy();
    expect(screen.queryByText('Distancia no disponible')).toBeNull();
  });

  it('con permiso aproximado, la distancia lleva la marca "aproximada"', async () => {
    await skipOnboarding();
    locationDouble().__setLocationPermission('approximate');

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    await screen.findByText('Templo de Debod');

    act(() => {
      locationDouble().__emitPosition(TEMPLO_DE_DEBOD);
    });

    expect(await screen.findByText('0 m')).toBeTruthy();
    expect(await screen.findByText('aproximada')).toBeTruthy();
  });

  it('la distancia se actualiza en vivo al desplazarse más de 25 m, sin salir de la ficha', async () => {
    await skipOnboarding();
    locationDouble().__setLocationPermission('granted');

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    await screen.findByText('Templo de Debod');

    act(() => {
      locationDouble().__emitPosition(TEMPLO_DE_DEBOD);
    });
    expect(await screen.findByText('0 m')).toBeTruthy();

    // ~55 m al norte del Templo de Debod (0.0005 grados de latitud).
    act(() => {
      locationDouble().__emitPosition({ lat: TEMPLO_DE_DEBOD.lat + 0.0005, lng: TEMPLO_DE_DEBOD.lng });
    });

    expect(await screen.findByText('Templo de Debod')).toBeTruthy(); // seguimos en la misma ficha
    expect(screen.queryByText('0 m')).toBeNull();
    expect(screen.getByText(/^\d+ m$/)).toBeTruthy();
  });
});
