import { localize } from './localize.ts';
import type { Catalog, Location, Tip, TipCategory } from './schema.ts';

const FALLBACK_CATEGORY: TipCategory = {
  id: '__uncategorized__',
  label: { es: 'Otros' },
};

export type LocationQuery = {
  text?: string;
  tagId?: string;
};

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Filters without sorting by distance: that needs the user's position. */
export function queryLocations(catalog: Catalog, query: LocationQuery): Location[] {
  const neighbourhoodsById = new Map(catalog.neighbourhoods.map((n) => [n.id, n]));
  const tagsById = new Map(catalog.tags.map((t) => [t.id, t]));

  return catalog.locations.filter((location) => {
    if (query.tagId && !location.tagIds.includes(query.tagId)) {
      return false;
    }
    if (query.text) {
      const needle = normalize(query.text);
      const neighbourhood = neighbourhoodsById.get(location.neighbourhoodId);
      const haystacks = [
        localize(location.name, 'es'),
        neighbourhood ? localize(neighbourhood.name, 'es') : '',
        ...location.tagIds.map((id) => {
          const tag = tagsById.get(id);
          return tag ? localize(tag.label, 'es') : '';
        }),
      ].map(normalize);
      if (!haystacks.some((haystack) => haystack.includes(needle))) {
        return false;
      }
    }
    return true;
  });
}

/** Tips grouped by category, in the catalog's order. Unknown categories fall back together. */
export function tipsByCategory(catalog: Catalog): { category: TipCategory; tips: Tip[] }[] {
  const categoriesById = new Map(catalog.tipCategories.map((c) => [c.id, c]));
  const groups = new Map<string, Tip[]>();

  for (const tip of catalog.tips) {
    const categoryId = categoriesById.has(tip.categoryId) ? tip.categoryId : FALLBACK_CATEGORY.id;
    const group = groups.get(categoryId) ?? [];
    group.push(tip);
    groups.set(categoryId, group);
  }

  const ordered: { category: TipCategory; tips: Tip[] }[] = [];
  for (const category of catalog.tipCategories) {
    const tips = groups.get(category.id);
    if (tips) ordered.push({ category, tips });
  }
  const fallbackTips = groups.get(FALLBACK_CATEGORY.id);
  if (fallbackTips) ordered.push({ category: FALLBACK_CATEGORY, tips: fallbackTips });

  return ordered;
}
