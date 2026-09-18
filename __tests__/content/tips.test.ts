import { describe, expect, it } from '@jest/globals';

import { tipsByCategory } from '../../src/core/content/query.ts';
import type { Catalog } from '../../src/core/content/schema.ts';

function minimalCatalog(overrides: Partial<Catalog>): Catalog {
  return {
    schemaVersion: 1,
    updatedAt: '2026-09-18',
    locales: ['es'],
    access: { premiumFields: [] },
    tags: [{ id: 'skyline', label: { es: 'Skyline' } }],
    tipCategories: [
      { id: 'ver', label: { es: 'Ver' } },
      { id: 'comer', label: { es: 'Comer' } },
    ],
    neighbourhoods: [],
    locations: [],
    tips: [],
    ...overrides,
  };
}

describe('tipsByCategory', () => {
  it('agrupa por categoría respetando el orden del catálogo', () => {
    const catalog = minimalCatalog({
      tips: [
        { id: 'a', categoryId: 'comer', title: { es: 'A' }, body: [{ es: 'a' }] },
        { id: 'b', categoryId: 'ver', title: { es: 'B' }, body: [{ es: 'b' }] },
      ],
    });
    const grouped = tipsByCategory(catalog);
    expect(grouped.map((g) => g.category.id)).toEqual(['ver', 'comer']);
    expect(grouped[0].tips.map((t) => t.id)).toEqual(['b']);
    expect(grouped[1].tips.map((t) => t.id)).toEqual(['a']);
  });

  it('conserva un consejo con categoría desconocida bajo una categoría de respaldo', () => {
    const catalog = minimalCatalog({
      tips: [
        {
          id: 'orphan',
          categoryId: 'unknown-category',
          title: { es: 'Huérfano' },
          body: [{ es: 'x' }],
        },
      ],
    });
    const grouped = tipsByCategory(catalog);
    const fallbackGroup = grouped.find((g) => g.tips.some((t) => t.id === 'orphan'));
    expect(fallbackGroup).toBeDefined();
    expect(fallbackGroup?.category.id).not.toBe('unknown-category');
  });

  it('ignora un relatedLocationIds roto al presentar, sin descartar el consejo', () => {
    const catalog = minimalCatalog({
      tips: [
        {
          id: 'a',
          categoryId: 'ver',
          title: { es: 'A' },
          body: [{ es: 'a' }],
          relatedLocationIds: ['nowhere'],
        },
      ],
    });
    const grouped = tipsByCategory(catalog);
    const tip = grouped.flatMap((g) => g.tips).find((t) => t.id === 'a');
    expect(tip).toBeDefined();
  });
});
