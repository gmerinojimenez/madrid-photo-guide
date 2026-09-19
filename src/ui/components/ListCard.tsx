import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme/tokens.ts';
import { ImagePlaceholder } from './ImagePlaceholder.tsx';

type Props = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  /** Nombre accesible; por defecto, `title`. */
  accessibilityLabel?: string;
  /** Contenido a la derecha del texto (candado, distancia…). */
  trailing?: ReactNode;
};

/** Tarjeta de lista compartida por mapa, guardados y consejos relacionados. */
export function ListCard({ title, subtitle, onPress, accessibilityLabel, trailing }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={styles.card}
    >
      <ImagePlaceholder style={styles.thumb} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
