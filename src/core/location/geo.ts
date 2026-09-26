import type { LatLng } from '../content/schema.ts';
import type { UserPosition } from './ports.ts';

/**
 * Distancia, umbrales y antigüedad (research.md D-005, D-006, D-008). Todo
 * puro: sin estado, sin reloj propio.
 */

/** Puerta del Sol, kilómetro cero, centro de referencia de "lejos de Madrid". */
export const PUERTA_DEL_SOL: LatLng = { lat: 40.416775, lng: -3.70379 };

/** Umbral de desplazamiento para aceptar una lectura nueva (FR-013). */
export const MOVE_THRESHOLD_M = 25;

/** Distancia a partir de la cual el filtro y el orden por cercanía se desactivan (FR-015). */
export const FAR_FROM_MADRID_M = 50_000;

/** Antigüedad a partir de la cual una posición se marca como antigua (FR-024). */
export const STALE_AFTER_MS = 10 * 60_000;

const EARTH_RADIUS_M = 6_371_008.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Distancia en línea recta entre dos puntos, en metros (haversine, research.md D-005). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_M * c;
}

/** Si una lectura nueva está lo bastante lejos de la última aceptada para sustituirla. */
export function movedEnough(previous: LatLng | null, next: LatLng): boolean {
  if (previous === null) return true;
  return distanceMeters(previous, next) >= MOVE_THRESHOLD_M;
}

/** Si una posición está a más de FAR_FROM_MADRID_M de la Puerta del Sol (límite estricto). */
export function isFarFromMadrid(position: LatLng): boolean {
  return distanceMeters(position, PUERTA_DEL_SOL) > FAR_FROM_MADRID_M;
}

/** Si una posición tiene más de STALE_AFTER_MS de antigüedad (límite estricto). */
export function isStale(position: UserPosition, now: number): boolean {
  return now - position.timestamp > STALE_AFTER_MS;
}
