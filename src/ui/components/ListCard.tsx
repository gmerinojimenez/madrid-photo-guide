import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ImageRef } from '../../core/content/schema.ts';
import { colors, radius, spacing } from '../theme/tokens.ts';
import { ImagePlaceholder } from './ImagePlaceholder.tsx';
import { LocationImage } from './LocationImage.tsx';

type Props = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  /** Nombre accesible; por defecto, `title`. */
  accessibilityLabel?: string;
  /** Contenido a la derecha del texto (candado, distancia…). */
  trailing?: ReactNode;
  /** Miniatura real a mostrar; si se omite, se mantiene el bloque de color. */
  image?: ImageRef;
  /**
   * Si se pasa, la miniatura gana su propio `Pressable` anidado que abre la
   * foto a pantalla completa (005-uncropped-photo-display, FR-001), sin
   * afectar al `onPress` de la fila (que sigue navegando a la localización).
   * Solo debe pasarse cuando el contenido ya es accesible (contracts/
   * photo-viewer-route.md): nunca para una vista previa bloqueada.
   */
  onImagePress?: () => void;
};

/** Tarjeta de lista compartida por mapa, guardados y consejos relacionados. */
export function ListCard({
  title,
  subtitle,
  onPress,
  accessibilityLabel,
  trailing,
  image,
  onImagePress,
}: Props) {
  // 005-uncropped-photo-display FR-006: la caja se mantiene fija (56×56), pero
  // ya no recorta la foto — `resizeMode="contain"` (LocationImage) deja hueco
  // en los lados que no llenen la proporción, y ese hueco se rellena con un
  // fondo neutro en vez de quedar vacío.
  const thumb = image ? (
    <View style={styles.thumbFrame}>
      <LocationImage imageRef={image} style={styles.thumbFill} />
    </View>
  ) : (
    <ImagePlaceholder style={styles.thumb} />
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={styles.card}
    >
      {onImagePress ? (
        <Pressable
          onPress={onImagePress}
          accessibilityRole="button"
          accessibilityLabel={`Ver foto completa de ${title}`}
        >
          {thumb}
        </Pressable>
      ) : (
        thumb
      )}
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
  thumbFrame: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.section,
  },
  thumbFill: {
    width: '100%',
    height: '100%',
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
