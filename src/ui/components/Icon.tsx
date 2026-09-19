import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { IconComponents, iconMap, type IconName } from '../theme/icons.ts';

type Props = {
  name: IconName;
  color?: ColorValue;
  size?: number;
} & Omit<ComponentProps<typeof IconComponents.ionicons>, 'name' | 'color' | 'size'>;

/**
 * Punto único de resolución de icono → familia de `@expo/vector-icons`, a través
 * de la tabla de equivalencias de `theme/icons.ts` (D-009). Ninguna pantalla
 * importa una familia de iconos directamente.
 */
export function Icon({ name, color, size = 24, ...rest }: Props) {
  const spec = iconMap[name];
  const Component = IconComponents[spec.family];
  return <Component name={spec.name as never} color={color} size={size} {...rest} />;
}
