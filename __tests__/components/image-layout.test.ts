import { describe, expect, it } from '@jest/globals';

import { computeContainedLayout } from '../../src/ui/components/imageLayout.ts';

/**
 * FR-002 / FR-004 / FR-005: encajar una imagen dentro de un espacio disponible
 * sin recortarla ni deformarla, para cualquier proporción (horizontal, vertical,
 * o extrema), y sin depender de renderizar React Native.
 */
describe('computeContainedLayout', () => {
  it('horizontal 4:3 (proporción del catálogo actual) limitada por el ancho', () => {
    const result = computeContainedLayout({ width: 1600, height: 1200 }, { maxWidth: 400 });
    expect(result).toEqual({ width: 400, height: 300 });
  });

  it('vertical 3:4 limitada por una altura máxima', () => {
    const result = computeContainedLayout(
      { width: 1200, height: 1600 },
      { maxWidth: 400, maxHeight: 400 },
    );
    // Sin límite de alto, 400 de ancho daría 533 de alto; con maxHeight: 400,
    // el alto manda y el ancho se reduce a 300 para conservar la proporción.
    expect(result).toEqual({ width: 300, height: 400 });
  });

  it('proporción extrema (muy panorámica) sigue sin recortar ni deformar', () => {
    const result = computeContainedLayout(
      { width: 3000, height: 500 },
      { maxWidth: 600, maxHeight: 400 },
    );
    expect(result.width).toBeLessThanOrEqual(600);
    expect(result.height).toBeLessThanOrEqual(400);
    expect(result.width / result.height).toBeCloseTo(3000 / 500, 5);
  });

  it('proporción que ya encaja exactamente no se recorta ni se agranda de más', () => {
    const result = computeContainedLayout(
      { width: 400, height: 300 },
      { maxWidth: 400, maxHeight: 300 },
    );
    expect(result).toEqual({ width: 400, height: 300 });
  });

  it('sin altura máxima, se limita solo por el ancho disponible', () => {
    const result = computeContainedLayout({ width: 800, height: 600 }, { maxWidth: 200 });
    expect(result).toEqual({ width: 200, height: 150 });
  });
});
