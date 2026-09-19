import type { LatLng } from '../content/schema.ts';

/**
 * Construcción pura de los enlaces de navegación externa (D-007). Este módulo no
 * abre nada: solo devuelve cadenas. Se usan URL universales `https://` en lugar de
 * esquemas de app, para no depender de que la app esté instalada.
 */

/** "40.42400, -3.71766" — seis decimales, punto decimal, coma y espacio. */
export function formatCoordinates(coords: LatLng): string {
  return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
}

/** URL universal de Google Maps apuntando al punto. */
export function googleMapsUrl(coords: LatLng, label?: string): string {
  const query = label
    ? `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}(${label})`
    : `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
  const params = new URLSearchParams({ api: '1', query });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/** URL universal de Apple Maps apuntando al punto. */
export function appleMapsUrl(coords: LatLng, label?: string): string {
  const params = new URLSearchParams({
    ll: `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`,
  });
  if (label) params.set('q', label);
  return `https://maps.apple.com/?${params.toString()}`;
}
