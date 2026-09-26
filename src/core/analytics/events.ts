import type { PermissionOrigin } from '../location/ports.ts';

/**
 * Catálogo tipado de eventos (principio IV): está prohibido emitir eventos
 * con strings sueltos en el punto de llamada. Una unión discriminada por
 * `name`, pensada para crecer con futuras features; esta añade solo el
 * primer miembro.
 *
 * Ningún miembro admite coordenadas, distancias ni identificadores de
 * localización (FR-027, FR-028): el tipo mismo lo impide.
 */
export type AnalyticsEvent = {
  name: 'location_permission_result';
  state: 'granted' | 'approximate' | 'denied';
  origin: PermissionOrigin;
};
