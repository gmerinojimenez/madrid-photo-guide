import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Tabla de equivalencias de iconos Phosphor (prototipo web) → `@expo/vector-icons`
 * (D-009). El prototipo usa Phosphor porque es una hoja de iconos web; esta tabla
 * concentra la traducción para que cada pantalla no elija su propio icono para el
 * mismo concepto.
 *
 * `ph-fill` es un modificador de peso del prototipo (variante rellena), no un icono
 * distinto, y no tiene entrada propia aquí.
 */
export type IconFamily = 'ionicons' | 'material-community';

export type IconSpec = { family: IconFamily; name: string };

export const iconMap = {
  aperture: { family: 'ionicons', name: 'aperture-outline' },
  arrowLeft: { family: 'ionicons', name: 'arrow-back' },
  arrowUpRight: { family: 'ionicons', name: 'open-outline' },
  bookmarkSimple: { family: 'ionicons', name: 'bookmark-outline' },
  bookmarkSimpleFilled: { family: 'ionicons', name: 'bookmark' },
  camera: { family: 'ionicons', name: 'camera-outline' },
  caretRight: { family: 'ionicons', name: 'chevron-forward' },
  check: { family: 'ionicons', name: 'checkmark' },
  clock: { family: 'ionicons', name: 'time-outline' },
  compass: { family: 'ionicons', name: 'compass-outline' },
  copy: { family: 'ionicons', name: 'copy-outline' },
  crop: { family: 'material-community', name: 'crop' },
  crosshair: { family: 'ionicons', name: 'locate-outline' },
  downloadSimple: { family: 'ionicons', name: 'download-outline' },
  eye: { family: 'ionicons', name: 'eye-outline' },
  image: { family: 'ionicons', name: 'image-outline' },
  listDashes: { family: 'ionicons', name: 'list-outline' },
  lockSimple: { family: 'ionicons', name: 'lock-closed-outline' },
  lockSimpleOpen: { family: 'ionicons', name: 'lock-open-outline' },
  magnifyingGlass: { family: 'ionicons', name: 'search-outline' },
  mapPin: { family: 'ionicons', name: 'location-outline' },
  mapTrifold: { family: 'ionicons', name: 'map-outline' },
  navigationArrow: { family: 'ionicons', name: 'navigate-outline' },
  receipt: { family: 'ionicons', name: 'receipt-outline' },
  slidersHorizontal: { family: 'ionicons', name: 'options-outline' },
  sunDim: { family: 'ionicons', name: 'sunny-outline' },
  timer: { family: 'ionicons', name: 'timer-outline' },
  translate: { family: 'ionicons', name: 'language-outline' },
  user: { family: 'ionicons', name: 'person-outline' },
  x: { family: 'ionicons', name: 'close' },
} as const satisfies Record<string, IconSpec>;

export type IconName = keyof typeof iconMap;

export const IconComponents = {
  ionicons: Ionicons,
  'material-community': MaterialCommunityIcons,
} as const;
