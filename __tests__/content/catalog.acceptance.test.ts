import { describe, expect, it } from '@jest/globals';

import rawCatalog from '../../src/content/catalog.json';
import { loadCatalog } from '../../src/core/content/catalog';
import { imageRegistry } from '../../src/platform/images/registry';

describe('catálogo real — aceptación', () => {
  it('carga las 5 localizaciones y los 5 consejos de la semilla', () => {
    const result = loadCatalog(rawCatalog);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.catalog.locations).toHaveLength(5);
    expect(result.catalog.tips).toHaveLength(5);
  });

  it('una consulta por identificador devuelve exactamente una pieza', () => {
    const result = loadCatalog(rawCatalog);
    if (result.status !== 'ok') throw new Error('catalog did not load');
    const matches = result.catalog.locations.filter((location) => location.id === 'debod');
    expect(matches).toHaveLength(1);
  });

  it('las 10 imágenes de la semilla (5 miniaturas + 5 detalles) resuelven contra el registro real', () => {
    const result = loadCatalog(rawCatalog);
    if (result.status !== 'ok') throw new Error('catalog did not load');
    for (const location of result.catalog.locations) {
      expect(imageRegistry.resolve(location.thumbnail)).not.toBeNull();
      expect(imageRegistry.resolve(location.detailImage)).not.toBeNull();
    }
  });
});
