import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import App from '../App';

/**
 * Prueba de ejemplo (FR-007, FR-008).
 *
 * Marcador de posición: solo valida que la infraestructura de tests se ejecuta y que
 * la pantalla raíz monta sin lanzar. Se sustituirá por pruebas de comportamiento en
 * cuanto exista comportamiento que probar.
 */
describe('App', () => {
  it('monta la pantalla raíz sin lanzar', () => {
    expect(() => render(<App />)).not.toThrow();
  });
});
