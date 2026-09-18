import {
  composeImageKey,
  type ImageResolver,
  type ImageSource,
} from '../../core/content/images.ts';
import type { ImageRef } from '../../core/content/schema.ts';

// Única lista de rutas literales del proyecto. Metro resuelve `require` de forma
// estática, así que estas entradas no pueden generarse dinámicamente.
const BUNDLED: Record<string, ImageSource> = {
  'debod/thumb': require('../../../assets/content/photos/debod/thumb.jpg'),
  'debod/detail': require('../../../assets/content/photos/debod/detail.jpg'),
  'castilla/thumb': require('../../../assets/content/photos/castilla/thumb.jpg'),
  'castilla/detail': require('../../../assets/content/photos/castilla/detail.jpg'),
  'torres/thumb': require('../../../assets/content/photos/torres/thumb.jpg'),
  'torres/detail': require('../../../assets/content/photos/torres/detail.jpg'),
  'sol/thumb': require('../../../assets/content/photos/sol/thumb.jpg'),
  'sol/detail': require('../../../assets/content/photos/sol/detail.jpg'),
  'mayor/thumb': require('../../../assets/content/photos/mayor/thumb.jpg'),
  'mayor/detail': require('../../../assets/content/photos/mayor/detail.jpg'),
};

export const imageRegistry: ImageResolver = {
  resolve(ref: ImageRef): ImageSource | null {
    const key = composeImageKey(ref);
    return key in BUNDLED ? BUNDLED[key] : null;
  },
};
