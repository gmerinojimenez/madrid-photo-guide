import type { ImageRef } from './schema.ts';

/** What the core needs from the platform to display an image. Opaque to the core. */
export type ImageSource = unknown;

export interface ImageResolver {
  /** Returns the image source, or null when the file is not available. */
  resolve(ref: ImageRef): ImageSource | null;
}

/** Builds the registry key `<locationId>/<usage>[-<index>]` for an image reference. */
export function composeImageKey(ref: ImageRef): string {
  if (ref.usage === 'extra') {
    return `${ref.locationId}/extra-${ref.index}`;
  }
  return `${ref.locationId}/${ref.usage}`;
}
