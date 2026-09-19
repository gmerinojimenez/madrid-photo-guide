import { describe, expect, it } from '@jest/globals';

import rawCatalog from '../../src/content/catalog.json';
import { loadCatalog } from '../../src/core/content/catalog';
import { imageRegistry } from '../../src/platform/images/registry';

describe('catálogo real — aceptación', () => {
  // El catálogo creció de 5 a 14 localizaciones (9 de pago) en 003-app-navigation-flows
  // (D-010); los 5 consejos de la semilla no cambian.
  it('carga las 14 localizaciones (5 gratis, 9 de pago) y los 5 consejos', () => {
    const result = loadCatalog(rawCatalog);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.catalog.locations).toHaveLength(14);
    expect(result.catalog.locations.filter((l) => l.access === 'free')).toHaveLength(5);
    expect(result.catalog.locations.filter((l) => l.access === 'premium')).toHaveLength(9);
    expect(result.catalog.tips).toHaveLength(5);
  });

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
