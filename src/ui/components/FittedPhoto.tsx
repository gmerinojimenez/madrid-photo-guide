import { Image, type ImageStyle, type StyleProp } from 'react-native';

import type { ImageResolver } from '../../core/content/images.ts';
import type { ImageRef } from '../../core/content/schema.ts';
import { imageRegistry } from '../../platform/images/registry.ts';
import { computeContainedLayout } from './imageLayout.ts';
import { ImagePlaceholder } from './ImagePlaceholder.tsx';

/** Proporción de reserva cuando el contenido no declara `aspectRatio` (research.md §2). */
const FALLBACK_ASPECT_RATIO = 4 / 3;

type Props = {
  imageRef: ImageRef;
  /** Ancho máximo disponible para la foto completa. */
  maxWidth: number;
  /** Alto máximo disponible; sin límite si se omite (solo el ancho manda). */
  maxHeight?: number;
  resolver?: ImageResolver;
  style?: StyleProp<ImageStyle>;
};

/**
 * Pinta una fotografía completa, sin recortar ni deformar, dimensionando su
 * propio contenedor según la proporción real de la imagen (FR-002, FR-004,
 * FR-005). A diferencia de `LocationImage` (que vive dentro de una caja ya de
 * tamaño fijo), aquí es el tamaño el que se calcula a partir de la foto: para
 * la cabecera de ficha y el visor a pantalla completa, las dos únicas
 * pantallas que necesitan este ajuste (research.md §5).
 *
 * La proporción viene del propio contenido (`ImageRef.aspectRatio`, ya
 * presente en el 100% del catálogo actual), no de leer la imagen en tiempo de
 * ejecución: así una foto vertical futura solo necesita declarar su
 * proporción en el dato, sin tocar código (SC-003).
 */
export function FittedPhoto({
  imageRef,
  maxWidth,
  maxHeight,
  resolver = imageRegistry,
  style,
}: Props) {
  const source = resolver.resolve(imageRef);
  if (source === null) {
    return <ImagePlaceholder style={[{ width: maxWidth, height: maxHeight ?? maxWidth }, style]} />;
  }

  const aspectRatio = imageRef.aspectRatio ?? FALLBACK_ASPECT_RATIO;
  const layout = computeContainedLayout({ width: aspectRatio, height: 1 }, { maxWidth, maxHeight });

  return (
    <Image
      source={source as never}
      resizeMode="contain"
      style={[{ width: layout.width, height: layout.height }, style]}
    />
  );
}
