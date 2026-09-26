import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Image } from 'react-native';

import { skipOnboarding } from './support.ts';

// La fuente de titularidad es un singleton del módulo `_layout.tsx`, que solo
// se carga una vez por fichero de test: una compra hecha en un `it()` sigue
// concedida en los siguientes. Cada test que necesita la compra la comprueba
// primero en lugar de asumir el estado "sin comprar".
async function ensureOwned(): Promise<void> {
  const trialBar = screen.queryByLabelText('Ver la guía completa');
  if (!trialBar) return; // ya tiene la compra, de un test anterior
  fireEvent.press(trialBar);
  fireEvent.press(await screen.findByText('Comprar'));
  await screen.findByText(/desbloqueada/i);
  fireEvent.press(screen.getByText('Volver al mapa'));
}

/**
 * US5 §4 §5 — contracts/screens.md: los tres estados de Guardados según
 * titularidad y contenido; los identificadores huérfanos se omiten.
 */
describe('Guardados', () => {
  it('sin la compra, muestra el estado vacío que explica que guardar es de la guía completa', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/saved' });
    expect(await screen.findAllByText(/guía completa/i)).not.toHaveLength(0);
    expect(screen.getByLabelText('Ver la guía completa')).toBeTruthy();
  });

  it('con la compra y sin guardados, invita a guardar desde el mapa', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');
    await ensureOwned();

    fireEvent.press(screen.getByLabelText('Guardados, tab, 3 of 4'));
    expect(await screen.findByText(/guarda tus localizaciones favoritas/i)).toBeTruthy();
  });

  it('con la compra y con guardados, lista del más reciente al más antiguo', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');
    await ensureOwned();

    fireEvent.press(await screen.findByLabelText('Templo de Debod'));
    fireEvent.press(await screen.findByLabelText('Guardar'));
    await screen.findByLabelText('Guardado');
    fireEvent.press(screen.getByLabelText('Volver'));

    fireEvent.press(await screen.findByLabelText('Puerta del Sol'));
    fireEvent.press(await screen.findByLabelText('Guardar'));
    await screen.findByLabelText('Guardado');
    fireEvent.press(screen.getByLabelText('Volver'));

    fireEvent.press(await screen.findByLabelText('Guardados, tab, 3 of 4'));
    const cards = await screen.findAllByLabelText(/^(Templo de Debod|Puerta del Sol)$/);
    expect(cards.map((c) => c.props.accessibilityLabel)).toEqual([
      'Puerta del Sol',
      'Templo de Debod',
    ]);
  });

  it('tocar la miniatura de una tarjeta guardada abre el visor a pantalla completa (005-uncropped-photo-display FR-001)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');
    await ensureOwned();

    // Calle Alcalá, no tocada por los demás `it()` de este fichero, para no
    // depender de si ya estaba guardada por otro test (D-013 punto 3).
    fireEvent.press(await screen.findByLabelText('Calle Alcalá'));
    fireEvent.press(await screen.findByLabelText('Guardar'));
    await screen.findByLabelText('Guardado');
    fireEvent.press(screen.getByLabelText('Volver'));

    fireEvent.press(await screen.findByLabelText('Guardados, tab, 3 of 4'));
    await screen.findByLabelText('Calle Alcalá');

    fireEvent.press(screen.getByLabelText('Ver foto completa de Calle Alcalá'));

    const images = await screen
      .findByLabelText('Cerrar')
      .then(() => screen.UNSAFE_getAllByType(Image));
    const fullscreen = images.find((image) =>
      String((image.props.source as { testUri?: string } | undefined)?.testUri ?? '').includes(
        'calle-alcala/thumb',
      ),
    );
    expect(fullscreen).toBeTruthy();
  });

  it('la tarjeta de una localización guardada muestra su miniatura real (FR-002)', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findByLabelText('Buscar localizaciones');
    await ensureOwned();

    // Cuatro Torres, no tocada por los tests previos de este fichero, para no
    // depender de si ya estaba guardada por otro `it()` (el almacén falso de
    // `expo-sqlite` persiste entre tests del mismo fichero, D-013 punto 3).
    fireEvent.press(await screen.findByLabelText('Cuatro Torres'));
    fireEvent.press(await screen.findByLabelText('Guardar'));
    await screen.findByLabelText('Guardado');
    fireEvent.press(screen.getByLabelText('Volver'));

    fireEvent.press(await screen.findByLabelText('Guardados, tab, 3 of 4'));
    await screen.findByLabelText('Cuatro Torres');

    const images = screen.UNSAFE_getAllByType(Image);
    const thumb = images.find((image) =>
      String((image.props.source as { testUri?: string } | undefined)?.testUri ?? '').includes(
        'torres/thumb',
      ),
    );
    expect(thumb).toBeTruthy();
  });
});
