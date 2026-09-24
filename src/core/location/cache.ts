import { z } from 'zod';

import type { UserPosition } from './ports.ts';

/**
 * Última posición conocida, persistida en `PreferencesStore` (research.md
 * D-006, data-model.md §2). Un único valor, sin tabla nueva.
 */
export const LAST_POSITION_KEY = 'location.last';

const cachedPositionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.enum(['precise', 'approximate']),
  timestamp: z.number(),
});

export function serializePosition(position: UserPosition): string {
  return JSON.stringify({
    lat: position.coords.lat,
    lng: position.coords.lng,
    accuracy: position.accuracy,
    timestamp: position.timestamp,
  });
}

/** Nunca lanza: un valor ausente, vacío, no-JSON o inválido se trata como ausente. */
export function parsePosition(raw: string | null): UserPosition | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = cachedPositionSchema.safeParse(parsed);
  if (!result.success) return null;

  const { lat, lng, accuracy, timestamp } = result.data;
  return {
    coords: { lat, lng },
    accuracy,
    timestamp,
    source: 'cache',
  };
}
