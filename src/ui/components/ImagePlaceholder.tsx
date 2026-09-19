import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme/tokens.ts';

type Props = { style?: StyleProp<ViewStyle> };

/**
 * Marcador de imagen con gradiente (FR-022): un bloque de color, nunca una
 * fotografía. Se simula el degradado con dos capas superpuestas en lugar de una
 * librería de gradiente, para no añadir una dependencia que research.md no
 * declara.
 */
export function ImagePlaceholder({ style }: Props) {
  return (
    <View style={[styles.base, style]}>
      <View style={styles.glow} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.section,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: '-40%',
    left: '-20%',
    width: '140%',
    height: '140%',
    backgroundColor: colors.sectionGlow,
    opacity: 0.55,
    transform: [{ rotate: '-12deg' }],
  },
});
