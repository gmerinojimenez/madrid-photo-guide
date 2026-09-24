import { screen } from 'expo-router/testing-library';

/**
 * Ayudante compartido por los tests de pantallas que no versan sobre la
 * presentación inicial: siembra `onboarding.completed` antes de montar el
 * árbol de rutas, para que `renderRouter('app', { initialUrl: '/' })` muestre
 * el mapa directamente en lugar de redirigir a `/onboarding` (R-1).
 */
export async function skipOnboarding(): Promise<void> {
  const sqlite = require('expo-sqlite') as {
    __seedPreference: (key: string, value: string) => Promise<void>;
  };
  await sqlite.__seedPreference('onboarding.completed', '1');
}

/**
 * Ids de localización de los marcadores actualmente renderizados, ordenados.
 * Se leen del `testID` (`marker-<id>-open|locked`) en lugar de contar a ojo,
 * para poder comparar contra `queryLocations` sin depender del tamaño o del
 * contenido concreto del catálogo.
 */
export function renderedLocationIds(): string[] {
  return screen
    .queryAllByTestId(/^marker-/)
    .map((marker) => String((marker.props as { testID?: string }).testID))
    .map((testID) => testID.replace(/^marker-/, '').replace(/-(open|locked)$/, ''))
    .sort();
}
