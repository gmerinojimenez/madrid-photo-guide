import { Image, type ImageStyle, type StyleProp } from 'react-native';

import type { ImageResolver } from '../../core/content/images.ts';
import type { ImageRef } from '../../core/content/schema.ts';
import { imageRegistry } from '../../platform/images/registry.ts';
import { ImagePlaceholder } from './ImagePlaceholder.tsx';

type Props = {
  imageRef: ImageRef;
  resolver?: ImageResolver;
  style?: StyleProp<ImageStyle>;
};

/**
 * Pinta la fotografía real de una `ImageRef`, o `ImagePlaceholder` si
 * `resolver` no la encuentra (D-010 deja de ser el comportamiento por
 * defecto: el bloque de color pasa a ser solo la recaída).
 */
export function LocationImage({ imageRef, resolver = imageRegistry, style }: Props) {
  const source = resolver.resolve(imageRef);
  if (source === null) {
    return <ImagePlaceholder style={style} />;
  }
  return <Image source={source} style={style} resizeMode="contain" />;
}
