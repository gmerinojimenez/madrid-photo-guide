import { describe, expect, it } from '@jest/globals';

import { appleMapsUrl, formatCoordinates, googleMapsUrl } from '../../src/core/navigation/links.ts';

const DEBOD = { lat: 40.424, lng: -3.71766 };

describe('formatCoordinates', () => {
  it('formatea con seis decimales, punto decimal y coma-espacio como separador', () => {
    expect(formatCoordinates(DEBOD)).toBe('40.424000, -3.717660');
  });

  it('mantiene el punto decimal invariable respecto del idioma', () => {
    // Number.prototype.toFixed no depende del locale del sistema; a diferencia de
    // toLocaleString, siempre usa "." — esto es lo que la URL necesita para resolver.
    const result = formatCoordinates(DEBOD);
    expect(result).not.toContain(',,');
    expect(result.split(', ')[0]).toMatch(/^-?\d+\.\d{6}$/);
    expect(result.split(', ')[1]).toMatch(/^-?\d+\.\d{6}$/);
  });

  it('soporta coordenadas negativas en ambos ejes', () => {
    expect(formatCoordinates({ lat: -33.865, lng: -3.5 })).toBe('-33.865000, -3.500000');
  });
});

describe('googleMapsUrl', () => {
  it('construye una URL universal con la query de coordenadas', () => {
    const url = googleMapsUrl(DEBOD);
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=40.424000%2C-3.717660');
  });

  it('escapa el nombre cuando se proporciona', () => {
    const url = googleMapsUrl(DEBOD, 'Templo de Debod & Parque');
    expect(url).toContain('query=40.424000%2C-3.717660');
    expect(url).toContain(encodeURIComponent('Templo de Debod & Parque').replace(/%20/g, '+'));
  });
});

describe('appleMapsUrl', () => {
  it('construye una URL universal con ll y sin q si no hay nombre', () => {
    const url = appleMapsUrl(DEBOD);
    expect(url).toBe('https://maps.apple.com/?ll=40.424000%2C-3.717660');
  });

  it('añade q con el nombre escapado cuando se proporciona', () => {
    const url = appleMapsUrl(DEBOD, 'Templo de Debod & Parque');
    expect(url).toContain('ll=40.424000%2C-3.717660');
    expect(url).toContain('q=');
    expect(url).toContain(encodeURIComponent('Templo de Debod & Parque').replace(/%20/g, '+'));
  });
});
