import type { ImageRef, LocalizedText, Location, Neighbourhood, Area } from './schema.ts';

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
