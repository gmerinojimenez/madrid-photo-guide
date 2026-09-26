import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { EmptyState } from '../src/ui/components/EmptyState.tsx';
import { FittedPhoto } from '../src/ui/components/FittedPhoto.tsx';
import { Icon } from '../src/ui/components/Icon.tsx';
import { useCatalog } from '../src/ui/providers/index.ts';
import { colors, spacing } from '../src/ui/theme/tokens.ts';

/**
 * Visor a pantalla completa (005-uncropped-photo-display, FR-001/002/003/008).
 * No decide por sí solo el acceso al contenido (contracts/photo-viewer-route.md):
 * solo se alcanza desde puntos que ya saben que muestran contenido
 * desbloqueado. Un `usage: 'detail'` de una localización de pago sin comprar
 * cae en el mismo estado de "contenido no disponible" porque esa imagen nunca
 * se empaqueta (D-010), no porque esta pantalla vuelva a comprobar titularidad.
 */
export default function PhotoViewerScreen() {
  const { locationId, usage } = useLocalSearchParams<{ locationId: string; usage: string }>();
  const catalog = useCatalog();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const location = catalog.locations.find((candidate) => candidate.id === locationId);
  const imageRef =
    usage === 'thumb'
      ? location?.thumbnail
      : usage === 'detail'
        ? location?.detailImage
        : undefined;

  if (!location || !imageRef) {
    return (
      <View style={[styles.container, styles.unavailable]}>
        <EmptyState
          icon="image"
          title="Contenido no disponible"
          message="Esta fotografía ya no está disponible."
          actionLabel="Volver"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        style={styles.closeButton}
      >
        <Icon name="x" color={colors.text} size={24} />
      </Pressable>
      <View style={styles.photoWrap}>
        <FittedPhoto imageRef={imageRef} maxWidth={width} maxHeight={height} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  unavailable: {
    backgroundColor: colors.bg,
  },
  photoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: spacing[8],
    right: spacing[4],
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
