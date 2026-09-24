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

/**
 * Simula un cambio de estado de la app (feature 004). Reexporta el ayudante
 * que `jest.setup.ts` cuelga de `globalThis`, porque un fichero de setup de
 * Jest no es importable directamente desde un test.
 */
export function setAppState(state: 'active' | 'background' | 'inactive'): void {
  const helper = (globalThis as { __setAppState?: (state: string) => void }).__setAppState;
  if (!helper) throw new Error('setAppState(): jest.setup.ts no ha registrado __setAppState');
  helper(state);
}
