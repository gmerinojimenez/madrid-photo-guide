export type IntrinsicSize = { width: number; height: number };
export type AvailableSpace = { maxWidth: number; maxHeight?: number };
export type ContainedLayout = { width: number; height: number };

/**
 * Encaja `intrinsic` dentro de `available` conservando su proporción, sin
 * recortarla ni deformarla (FR-002, FR-004, FR-005). Equivalente puro, y por
 * tanto testeable sin renderizar React Native, de lo que `resizeMode="contain"`
 * hace dentro de una caja: aquí el resultado se usa para dimensionar el propio
 * contenedor, no solo la imagen dentro de una caja ya fija.
 */
export function computeContainedLayout(
  intrinsic: IntrinsicSize,
  available: AvailableSpace,
): ContainedLayout {
  if (intrinsic.width <= 0 || intrinsic.height <= 0) {
    return { width: available.maxWidth, height: available.maxHeight ?? available.maxWidth };
  }

  const widthAtMaxWidth = available.maxWidth;
  const heightAtMaxWidth = (intrinsic.height / intrinsic.width) * widthAtMaxWidth;

  if (available.maxHeight === undefined || heightAtMaxWidth <= available.maxHeight) {
    return { width: widthAtMaxWidth, height: heightAtMaxWidth };
  }

  const heightAtMaxHeight = available.maxHeight;
  const widthAtMaxHeight = (intrinsic.width / intrinsic.height) * heightAtMaxHeight;
  return { width: widthAtMaxHeight, height: heightAtMaxHeight };
}
