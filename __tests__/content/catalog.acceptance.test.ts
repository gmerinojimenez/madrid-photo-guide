import { describe, expect, it } from '@jest/globals';

import rawCatalog from '../../src/content/catalog.json';
import { loadCatalog } from '../../src/core/content/catalog';
import { imageRegistry } from '../../src/platform/images/registry';

describe('catálogo real — aceptación', () => {
  it('una consulta por identificador devuelve exactamente una pieza', () => {
    const result = loadCatalog(rawCatalog);
    if (result.status !== 'ok') throw new Error('catalog did not load');
    const matches = result.catalog.locations.filter((location) => location.id === 'debod');
    expect(matches).toHaveLength(1);
  });

  it('toda localización resuelve su miniatura contra el registro real', () => {
    const result = loadCatalog(rawCatalog);
    if (result.status !== 'ok') throw new Error('catalog did not load');
    for (const location of result.catalog.locations) {
      expect(imageRegistry.resolve(location.thumbnail)).not.toBeNull();
    }
  });

  // El detalle solo se empaqueta para las localizaciones gratuitas: el validador de
  // la constitución prohíbe empaquetar el detalle de una localización de pago.
  it('las localizaciones gratuitas resuelven también su imagen de detalle', () => {
    const result = loadCatalog(rawCatalog);
    if (result.status !== 'ok') throw new Error('catalog did not load');
    for (const location of result.catalog.locations.filter((l) => l.access === 'free')) {
      expect(imageRegistry.resolve(location.detailImage)).not.toBeNull();
    }
  });

  it('las localizaciones de pago no tienen imagen de detalle empaquetada', () => {
    const result = loadCatalog(rawCatalog);
    if (result.status !== 'ok') throw new Error('catalog did not load');
    for (const location of result.catalog.locations.filter((l) => l.access === 'premium')) {
      expect(imageRegistry.resolve(location.detailImage)).toBeNull();
    }
  });
});
