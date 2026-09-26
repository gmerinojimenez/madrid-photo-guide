import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LocationPreview } from '../../core/content/access.ts';
import { localize } from '../../core/content/localize.ts';
import type { Neighbourhood, Tag } from '../../core/content/schema.ts';
import { Icon } from '../components/Icon.tsx';
import { LocationImage } from '../components/LocationImage.tsx';
import { colors, radius, spacing } from '../theme/tokens.ts';
import { SheetHost } from './SheetHost.tsx';

type Props = {
  visible: boolean;
  preview: LocationPreview | null;
  neighbourhood: Neighbourhood | undefined;
  tags: Tag[];
  onUnlock: () => void;
  onDismiss: () => void;
};

const LOCKED_ROWS: { icon: Parameters<typeof Icon>[0]['name']; label: string }[] = [
  { icon: 'crosshair', label: 'Coordenadas exactas' },
  { icon: 'aperture', label: 'Parámetros de cámara' },
  { icon: 'image', label: 'Fotografía en detalle' },
];

/**
 * Panel de contenido bloqueado (US2 §1 §2, FR-010). Se alimenta **solo** de la
 * `LocationPreview`: el tipo no declara coordenadas, EXIF ni descripción, así
 * que no hay nada que filtrar por accidente. Las filas de candado nombran lo
 * que falta, nunca sus valores.
 */
export function LockedSheet({ visible, preview, neighbourhood, tags, onUnlock, onDismiss }: Props) {
  return (
    <SheetHost
      visible={visible}
      onClose={onDismiss}
      accessibilityLabel={
        preview ? `Contenido bloqueado: ${localize(preview.name, 'es')}` : 'Contenido bloqueado'
      }
    >
      {preview ? (
        <View style={styles.content}>
          <View style={styles.imageFrame}>
            <LocationImage imageRef={preview.thumbnail} style={styles.image} />
          </View>
          <Text style={styles.name}>{localize(preview.name, 'es')}</Text>
          {neighbourhood ? (
            <Text style={styles.neighbourhood}>{localize(neighbourhood.name, 'es')}</Text>
          ) : null}

          <View style={styles.tagRow}>
            {tags.map((tag) => (
              <View key={tag.id} style={styles.tag}>
                <Text style={styles.tagLabel}>{localize(tag.label, 'es')}</Text>
              </View>
            ))}
          </View>

          <View style={styles.row}>
            <Icon name="crosshair" color={colors.textMuted} size={18} />
            <Text style={styles.rowLabel}>Distancia</Text>
            <Text style={styles.rowValue}>Distancia no disponible</Text>
          </View>

          <View style={styles.lockedRows}>
            {LOCKED_ROWS.map((row) => (
              <View key={row.label} style={styles.row}>
                <Icon name="lockSimple" color={colors.textMuted} size={16} />
                <Text style={styles.lockedLabel}>{row.label}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={onUnlock}
            accessibilityRole="button"
            accessibilityLabel="Desbloquear"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonLabel}>Desbloquear</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Seguir en modo prueba"
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonLabel}>Seguir en modo prueba</Text>
          </Pressable>
        </View>
      ) : null}
    </SheetHost>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[3],
  },
  imageFrame: {
    height: 140,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.section,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '500',
  },
  neighbourhood: {
    color: colors.textMuted,
    fontSize: 14,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.accent800,
  },
  tagLabel: {
    color: colors.accent100,
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  rowValue: {
    color: colors.text,
    fontSize: 13,
  },
  lockedRows: {
    gap: spacing[2],
  },
  lockedLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  primaryButton: {
    marginTop: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '500',
  },
  secondaryButton: {
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: colors.accent,
    fontSize: 14,
  },
});
