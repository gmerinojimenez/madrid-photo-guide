import type { ContentLogger } from '../../core/content/logging.ts';

/**
 * Implementación de `ContentLogger` de esta entrega: registra por `console.warn`.
 * Es el punto único que sustituir cuando llegue la feature de observabilidad
 * (Crashlytics), sin tocar quien lo consume (principio IV).
 */
export const consoleLogger: ContentLogger = {
  discarded(piece) {
    console.warn(
      `[${piece.collection}] descartado${piece.id ? ` (${piece.id})` : ''}: ${piece.reason}`,
    );
  },
};
