import type { UnavailableReason, VisibleDistance } from './ports.ts';

/**
 * Formato de distancia en español (research.md D-005, data-model.md §1). A
 * mano, sin `Intl`: un único formato fijo, sin depender del soporte de
 * `Intl` con locale `es` en el motor de JavaScript.
 */

/** "450 m" por debajo de 1000 m; "1,2 km" desde 1000 m, con coma decimal. */
export function formatDistance(meters: number): string {
  const roundedMeters = Math.round(meters);
  if (roundedMeters < 1000) {
    return `${roundedMeters} m`;
  }
  const km = (roundedMeters / 1000).toFixed(1).replace('.', ',');
  return `${km} km`;
}

const UNAVAILABLE_REASON_TEXT: Record<UnavailableReason, string> = {
  'no-permission': 'Sin permiso de ubicación',
  'services-off': 'Ubicación desactivada en el sistema',
  'no-position': 'Buscando tu posición…',
};

/** Texto principal y detalle secundario de una `VisibleDistance` (data-model.md §1). */
export function formatVisibleDistance(distance: VisibleDistance): {
  value: string;
  detail: string | null;
} {
  if (distance.kind === 'unavailable') {
    return { value: 'Distancia no disponible', detail: UNAVAILABLE_REASON_TEXT[distance.reason] };
  }

  const value =
    distance.kind === 'exact'
      ? formatDistance(distance.meters)
      : distance.band === 'under-1km'
        ? '< 1 km'
        : `~${(distance.band.halfKm * 0.5).toFixed(1).replace('.', ',')} km`;

  const marks: string[] = [];
  if (distance.approximate) marks.push('aproximada');
  if (distance.stale) marks.push('posición antigua');

  return { value, detail: marks.length > 0 ? marks.join(' · ') : null };
}
