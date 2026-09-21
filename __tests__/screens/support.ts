/**
 * Ayudante compartido por los tests de pantallas que no versan sobre la
 * presentación inicial: siembra `onboarding.completed` antes de montar el
 * árbol de rutas, para que `renderRouter('app', { initialUrl: '/' })` muestre
 * el mapa directamente en lugar de redirigir a `/onboarding` (R-1).
 */
export async function skipOnboarding(): Promise<void> {
  const sqlite = require('expo-sqlite') as { __seedPreference: (key: string, value: string) => Promise<void> };
  await sqlite.__seedPreference('onboarding.completed', '1');
}
