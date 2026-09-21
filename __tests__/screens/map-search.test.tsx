import { describe, expect, it } from '@jest/globals';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

/**
 * US1 §4 §5 — FR-015, FR-016, FR-019: el buscador filtra por nombre, barrio y
 * etiqueta ignorando mayúsculas y acentos; los chips de tipo filtran; los
 * criterios se componen; sin resultados se informa.
 */
describe('Mapa — búsqueda y filtros', () => {
  it('buscar "debod" deja solo esa localización', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    const input = await screen.findByLabelText('Buscar localizaciones');
    fireEvent.changeText(input, 'debod');
    expect(await screen.findAllByTestId(/^marker-/)).toHaveLength(1);
    expect(screen.getByLabelText('Templo de Debod')).toBeTruthy();
  });

  it('buscar "Argüelles" y "arguelles" (sin acento) filtra igual, por el barrio', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    const input = await screen.findByLabelText('Buscar localizaciones');

    fireEvent.changeText(input, 'Argüelles');
    const withAccent = await screen.findAllByTestId(/^marker-/);

    fireEvent.changeText(input, 'arguelles');
    const withoutAccent = await screen.findAllByTestId(/^marker-/);

    expect(withoutAccent.map((m) => m.props.testID)).toEqual(withAccent.map((m) => m.props.testID));
    expect(withAccent).toHaveLength(1);
    expect(screen.getByLabelText('Templo de Debod')).toBeTruthy();
  });

  it('seleccionar el chip "Callejera" filtra a las localizaciones con esa etiqueta', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findAllByTestId(/^marker-/);
    fireEvent.press(screen.getByText('Callejera'));
    // sol (callejera, nocturna), mayor (arquitectura, callejera) y lavapies (callejera)
    expect(await screen.findAllByTestId(/^marker-/)).toHaveLength(3);
  });

  it('los criterios de búsqueda y chip se componen', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    const input = await screen.findByLabelText('Buscar localizaciones');
    fireEvent.press(screen.getByText('Callejera'));
    fireEvent.changeText(input, 'sol');
    expect(await screen.findAllByTestId(/^marker-/)).toHaveLength(1);
    expect(screen.getByLabelText('Puerta del Sol')).toBeTruthy();
  });

  it('el chip "Todo" no filtra: restituye todas las localizaciones', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    await screen.findAllByTestId(/^marker-/);
    fireEvent.press(screen.getByText('Callejera'));
    await screen.findAllByTestId(/^marker-/);
    fireEvent.press(screen.getByText('Todo'));
    expect(await screen.findAllByTestId(/^marker-/)).toHaveLength(14);
  });

  it('sin resultados, se informa en lugar de dejar el mapa mudo', async () => {
    await skipOnboarding();
    renderRouter('app', { initialUrl: '/' });
    const input = await screen.findByLabelText('Buscar localizaciones');
    fireEvent.changeText(input, 'no-existe-ninguna-localizacion-con-este-texto');
    expect(await screen.findByText(/sin resultados/i)).toBeTruthy();
  });
});
