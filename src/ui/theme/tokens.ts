/**
 * Tokens del sistema de diseño "Nocturne" (D-008). Tema oscuro único: la app no
 * define una paleta clara y ninguna pantalla debe leer `useColorScheme`.
 *
 * Valores trasladados tal cual de
 * `design/Guía de fotografía Madrid/_ds/nocturne-<id>/styles.css`. `--color-divider`
 * usa `color-mix()` de CSS, que no existe en React Native: se traduce a su
 * equivalente `rgba`.
 */
export const colors = {
  bg: '#161826',
  surface: '#232532',
  text: '#e9e9ed',
  textMuted: 'rgba(233, 233, 237, 0.55)',
  accent: '#9184d9',
  accent2: '#a7a1db',
  divider: 'rgba(233, 233, 237, 0.16)',

  accent100: '#f5f4ff',
  accent200: '#e7e5fe',
  accent300: '#d2cefd',
  accent400: '#b5abfc',
  accent500: '#968ae0',
  accent600: '#796cbf',
  accent700: '#5d5294',
  accent800: '#423a6a',
  accent900: '#2b2741',

  section: '#262a60',
  sectionGlow: '#353b80',
  sectionGhost: '#4c5397',

  neutral100: '#f3f5fe',
  neutral200: '#e4e7f5',
  neutral300: '#cfd3e5',
  neutral400: '#b2b6ca',
  neutral500: '#9397ab',
  neutral600: '#75798c',
  neutral700: '#595d6c',
  neutral800: '#3f424d',
  neutral900: '#292b31',
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
} as const;

export const spacing = {
  1: 2.8,
  2: 5.6,
  3: 8.4,
  4: 11.2,
  6: 16.8,
  8: 22.4,
} as const;

export const theme = { colors, radius, spacing } as const;

export type Theme = typeof theme;
