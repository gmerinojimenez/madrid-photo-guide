import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

const SOL = { lat: 40.416775, lng: -3.70379 };

beforeEach(() => {
  const sqlite = require('expo-sqlite') as { __resetFakeDatabases: () => void };
  sqlite.__resetFakeDatabases();
});

/**
 * SC-003, FR-010 — ningún campo reservado a la compra es alcanzable sin ella
 * por ninguna ruta: ni por el mapa, ni por la búsqueda.
 */
describe('Fuga de contenido de pago', () => {
  it('buscar una localización de pago por nombre no revela sus campos reservados', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    const input = await screen.findByLabelText('Buscar localizaciones');
    fireEvent.changeText(input, 'Tío Pío');

    await screen.findAllByTestId(/^marker-/);
    expect(screen.queryByText(/40\.39/)).toBeNull();
    expect(screen.queryByText('Sony A7 IV')).toBeNull();
  });

  it('la ficha de una localización de pago no es alcanzable por enlace directo sin la compra', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/location/tiopio' });
    expect(await screen.findByText(/contenido no disponible/i)).toBeTruthy();
    expect(screen.queryByText('Sony A7 IV')).toBeNull();
    expect(screen.queryByText(/40\.39/)).toBeNull();
  });

  it('el panel de contenido bloqueado nunca expone coordenadas, EXIF ni descripción', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findAllByTestId(/^marker-/);
    for (const name of ['Cerro del Tío Pío', 'Círculo de Bellas Artes', 'Matadero Madrid']) {
      fireEvent.press(screen.getByLabelText(name));
      expect(await screen.findByText(name)).toBeTruthy();
      expect(screen.queryByText('Sony A7 IV')).toBeNull();
      expect(screen.queryByText(/^-?\d+\.\d{4,6}, -?\d+\.\d{4,6}$/)).toBeNull();
      fireEvent.press(screen.getByText('Seguir en modo prueba'));
    }
  });

  // SC-005 (feature 004): con permiso y posición, la distancia de una
  // localización bloqueada solo aparece redondeada — ningún texto renderizado
  // lleva la distancia exacta en metros, ni una decimal distinta de ,0 o ,5.
  it('con permiso y posición, ninguna localización de pago muestra su distancia exacta', async () => {
    const location = require('expo-location') as {
      __setLocationPermission: (state: string) => void;
      __emitPosition: (coords: { lat: number; lng: number }) => void;
    };
    location.__setLocationPermission('granted');
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');
    act(() => {
      location.__emitPosition(SOL);
    });

    for (const name of ['Cerro del Tío Pío', 'Círculo de Bellas Artes', 'Matadero Madrid', 'Puente de Toledo']) {
      fireEvent.press(await screen.findByLabelText(name));
      expect(await screen.findByText(name)).toBeTruthy();

      // La única distancia visible es "< 1 km" o "~N,0 km" / "~N,5 km".
      expect(screen.queryByText(/^\d+ m$/)).toBeNull();
      expect(screen.queryByText(/^~\d+,[^05] km$/)).toBeNull();

      fireEvent.press(screen.getByText('Seguir en modo prueba'));
    }
  });
});
