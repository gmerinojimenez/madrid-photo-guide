import type { ImageRef, LocalizedText, Location, Neighbourhood, Area } from './schema.ts';
import { distanceMeters, isStale } from '../location/geo.ts';
import type { LocationSnapshot, VisibleDistance } from '../location/ports.ts';

export type Entitlement = { owned: boolean };

/** What a non-owner sees. A distinct type, never `Partial<Location>` (D-006). */
export type LocationPreview = {
  id: string;
  name: LocalizedText;
  neighbourhoodId: string;
  tagIds: string[];
  approximateArea: Area;
  access: 'free' | 'premium';
  thumbnail: ImageRef;
};

/** Declared classification. The schema already normalizes an absent or unknown mark to "premium". */
export function accessOf(location: Location): 'free' | 'premium' {
  return location.access;
}

function toPreview(location: Location): LocationPreview {
  return {
    id: location.id,
    name: location.name,
    neighbourhoodId: location.neighbourhoodId,
    tagIds: location.tagIds,
    approximateArea: location.approximateArea,
    access: location.access,
    thumbnail: location.thumbnail,
  };
}

/** Projects a location according to entitlement. Pure function. */
export function viewLocation(
  location: Location,
  entitlement: Entitlement,
): Location | LocationPreview {
  if (accessOf(location) === 'free' || entitlement.owned) {
    return location;
  }
  return toPreview(location);
}

/** Discriminator for screens: avoids checking fields by hand. */
export function isFullLocation(view: Location | LocationPreview): view is Location {
  return 'coords' in view;
}

/** Resolves a neighbourhood's description. Requires a full Location, unreachable from a preview. */
export function neighbourhoodDescriptionOf(
  location: Location,
  neighbourhoods: Neighbourhood[],
): LocalizedText | undefined {
  return neighbourhoods.find((n) => n.id === location.neighbourhoodId)?.description;
}

/**
 * Distancia que la UI puede ver de una localización, según su acceso
 * (feature 004, FR-020–FR-022, research.md D-007). Es la única función del
 * proyecto que calcula una distancia entre la persona y una localización:
 * necesita `location.coords`, que una `LocationPreview` no tiene.
 *
 * De pago sin la compra → redondeada, sin campo de metros: el tipo impide
 * que la variante `rounded` filtre la distancia exacta (SC-005). Gratuita o
 * con la compra → exacta.
 */
export function visibleDistance(
  location: Location,
  entitlement: Entitlement,
  snapshot: LocationSnapshot,
  now: number,
): VisibleDistance {
  if (snapshot.position === null) {
    if (snapshot.permission !== 'granted' && snapshot.permission !== 'approximate') {
      return { kind: 'unavailable', reason: 'no-permission' };
    }
    if (!snapshot.servicesEnabled) {
      return { kind: 'unavailable', reason: 'services-off' };
    }
    return { kind: 'unavailable', reason: 'no-position' };
  }

  const meters = distanceMeters(snapshot.position.coords, location.coords);
  const marks = {
    approximate: snapshot.position.accuracy === 'approximate',
    stale: isStale(snapshot.position, now),
  };

  if (accessOf(location) === 'free' || entitlement.owned) {
    return { kind: 'exact', meters, ...marks };
  }

  const band = meters < 1000 ? ('under-1km' as const) : { halfKm: Math.round(meters / 500) };
  return { kind: 'rounded', band, ...marks };
}
