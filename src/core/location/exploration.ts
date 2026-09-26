import { isFarFromMadrid } from './geo.ts';
import type {
  DistanceRadius,
  ExplorationAvailability,
  LocationSnapshot,
  VisibleDistance,
} from './ports.ts';

/**
 * Disponibilidad del filtro de distancia y radio efectivo (research.md D-008,
 * US3). El orden de prioridad de los motivos es el de `explorationAvailability`.
 */
export function explorationAvailability(snapshot: LocationSnapshot): ExplorationAvailability {
  if (snapshot.permission !== 'granted' && snapshot.permission !== 'approximate') {
    return { available: false, reason: 'no-permission' };
  }
  if (!snapshot.servicesEnabled && snapshot.position === null) {
    return { available: false, reason: 'services-off' };
  }
  if (snapshot.position === null) {
    return { available: false, reason: 'no-position' };
  }
  if (isFarFromMadrid(snapshot.position.coords)) {
    return { available: false, reason: 'far-from-madrid' };
  }
  return { available: true };
}

/** El radio elegido si la exploración está disponible; `'all'` si no. */
export function effectiveRadius(
  radius: DistanceRadius,
  availability: ExplorationAvailability,
): DistanceRadius {
  return availability.available ? radius : 'all';
}

const RADIUS_METERS: Record<'under-1km' | 'under-3km', number> = {
  'under-1km': 1000,
  'under-3km': 3000,
};

/** Distancia (en el valor mostrado) que representa una `VisibleDistance`, en metros. */
function shownMeters(distance: VisibleDistance): number | null {
  if (distance.kind === 'exact') return distance.meters;
  if (distance.kind === 'unavailable') return null;
  return distance.band === 'under-1km' ? 999 : distance.band.halfKm * 500;
}

/** Si una distancia entra en el radio, comparando con el valor mostrado, nunca el exacto. */
export function withinRadius(distance: VisibleDistance, radius: DistanceRadius): boolean {
  if (radius === 'all') return true;
  const meters = shownMeters(distance);
  if (meters === null) return false;
  return meters < RADIUS_METERS[radius];
}
