import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { Image } from 'react-native';

import { LocationImage } from '../../src/ui/components/LocationImage.tsx';
import type { ImageResolver, ImageSource } from '../../src/core/content/images.ts';
import type { ImageRef } from '../../src/core/content/schema.ts';

const REF: ImageRef = { locationId: 'debod', usage: 'thumb', alt: { es: 'alt' } };

/**
 * FR-004 / research.md R-004a: el catálogo real nunca tiene una localización
 * sin imagen empaquetada, así que la recaída a ImagePlaceholder solo puede
 * ejercitarse aquí, inyectando un resolver falso.
 */
describe('LocationImage', () => {
  it('con un resolver que encuentra la imagen, renderiza la fotografía real', () => {
    const source: ImageSource = { uri: 'bundled://debod-thumb' };
    const resolver: ImageResolver = { resolve: () => source };

    const { UNSAFE_getByType, UNSAFE_queryAllByType } = render(
      <LocationImage imageRef={REF} resolver={resolver} />,
    );

    expect(UNSAFE_getByType(Image).props.source).toBe(source);
    expect(UNSAFE_queryAllByType(Image)).toHaveLength(1);
  });

  it('con un resolver que no encuentra la imagen (null), recae en ImagePlaceholder sin lanzar', () => {
    const resolver: ImageResolver = { resolve: () => null };

    const { UNSAFE_queryAllByType } = render(<LocationImage imageRef={REF} resolver={resolver} />);

    expect(UNSAFE_queryAllByType(Image)).toHaveLength(0);
  });
});
