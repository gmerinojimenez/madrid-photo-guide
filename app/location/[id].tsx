import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  isFullLocation,
  localize,
  viewLocation,
  visibleDistance,
} from '../../src/core/content/index.ts';
import { formatVisibleDistance } from '../../src/core/location/index.ts';
import { formatCoordinates } from '../../src/core/navigation/links.ts';
import { EmptyState } from '../../src/ui/components/EmptyState.tsx';
import { Icon } from '../../src/ui/components/Icon.tsx';
import { LocationImage } from '../../src/ui/components/LocationImage.tsx';
import { NavSheet } from '../../src/ui/sheets/NavSheet.tsx';
import {
  useCatalog,
  useEntitlement,
  useSavedLocationsStore,
  useUserLocation,
} from '../../src/ui/providers/index.ts';
import { colors, radius, spacing } from '../../src/ui/theme/tokens.ts';

/**
 * Ficha de localización (US1/US5, FR-020, FR-021, FR-024). Solo se alcanza
 * para localizaciones accesibles (R-3 de contracts/routes.md): si el `id` no
 * existe en el catálogo, o proyecta a una vista previa (alcanzada por enlace
 * directo sin pasar por el punto de decisión del mapa), se trata igual —
 * "contenido no disponible", sin lanzar y con vuelta atrás.
 */
export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const entitlement = useEntitlement();
  const savedLocations = useSavedLocationsStore();
  const { snapshot, now, ensureLocation } = useUserLocation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const [navVisible, setNavVisible] = useState(false);

  const location = catalog.locations.find((candidate) => candidate.id === id);
  const view = location ? viewLocation(location, entitlement) : null;
  const full = view && isFullLocation(view) ? view : null;

  // Se re-lee al ganar el foco: guardar puede haber cambiado desde otra
  // pantalla (o desde esta misma, tras volver de un paso intermedio).
  useFocusEffect(
    useCallback(() => {
      if (!full) return;
      let cancelled = false;
      savedLocations.has(full.id).then((value) => {
        if (!cancelled) setSaved(value);
      });
      return () => {
        cancelled = true;
      };
    }, [full, savedLocations]),
  );

  if (!full) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState
          icon="mapPin"
          title="Contenido no disponible"
          message="Esta localización ya no existe en la guía."
          actionLabel="Volver"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const neighbourhood = catalog.neighbourhoods.find((n) => n.id === full.neighbourhoodId);
  const tags = full.tagIds
    .map((tagId) => catalog.tags.find((tag) => tag.id === tagId))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));

  // FR-011, FR-012, FR-014, US1 §3-§6: la distancia real sustituye a "no
  // disponible"; sin permiso, la fila es tocable (contracts/screens.md).
  const distance = visibleDistance(full, entitlement, snapshot, now);
  const formattedDistance = formatVisibleDistance(distance);

  async function handleToggleSave() {
    // FR-027: la comprobación de titularidad ocurre ANTES de escribir.
    if (!entitlement.owned) {
      router.push('/paywall');
      return;
    }
    if (saved) {
      await savedLocations.remove(full!.id);
      setSaved(false);
    } else {
      await savedLocations.save(full!.id);
      setSaved(true);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing[4] }]}
    >
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.iconButton}
        >
          <Icon name="arrowLeft" color={colors.text} size={22} />
        </Pressable>
        <Pressable
          onPress={handleToggleSave}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Guardado' : 'Guardar'}
          style={styles.iconButton}
        >
          <Icon
            name={saved ? 'bookmarkSimpleFilled' : 'bookmarkSimple'}
            color={colors.accent}
            size={22}
          />
        </Pressable>
      </View>

      <LocationImage imageRef={full.detailImage} style={styles.image} />

      <Text style={styles.name}>{localize(full.name, 'es')}</Text>
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

      {full.bestTime ? (
        <Row icon="clock" label="Mejor momento" value={localize(full.bestTime, 'es')} />
      ) : null}

      <Row
        icon="crosshair"
        label="Distancia"
        value={formattedDistance.value}
        detail={formattedDistance.detail}
        onPress={distance.kind === 'unavailable' ? () => ensureLocation('contextual') : undefined}
        actionLabel="Activar ubicación"
      />

      <Row icon="mapPin" label="Coordenadas" value={formatCoordinates(full.coords)} />

      <Pressable
        onPress={() => setNavVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Navegar hasta la foto"
        style={styles.navButton}
      >
        <Icon name="navigationArrow" color={colors.bg} size={18} />
        <Text style={styles.navButtonLabel}>Navegar hasta la foto</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>La toma</Text>
      <Text style={styles.body}>{localize(full.shotDescription, 'es')}</Text>

      {full.capture ? (
        <View style={styles.captureGrid}>
          {full.capture.camera ? (
            <Text style={styles.captureItem}>{full.capture.camera}</Text>
          ) : null}
          {full.capture.focalLengthMm ? (
            <Text style={styles.captureItem}>{full.capture.focalLengthMm} mm</Text>
          ) : null}
          {full.capture.aperture ? (
            <Text style={styles.captureItem}>{full.capture.aperture}</Text>
          ) : null}
          {full.capture.shutterSpeed ? (
            <Text style={styles.captureItem}>{full.capture.shutterSpeed}</Text>
          ) : null}
          {full.capture.iso ? <Text style={styles.captureItem}>ISO {full.capture.iso}</Text> : null}
        </View>
      ) : null}

      {neighbourhood?.description ? (
        <>
          <Text style={styles.sectionTitle}>El barrio</Text>
          <Text style={styles.body}>{localize(neighbourhood.description, 'es')}</Text>
        </>
      ) : null}

      <NavSheet visible={navVisible} onClose={() => setNavVisible(false)} coords={full.coords} />
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
  detail,
  onPress,
  actionLabel,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
  /** Texto secundario (feature 004): marca de "aproximada"/"antigua", o el motivo si no está disponible. */
  detail?: string | null;
  /** Si se pasa, la fila entera se vuelve tocable (feature 004, US1 §6). */
  onPress?: () => void;
  actionLabel?: string;
}) {
  const content = (
    <>
      <Icon name={icon} color={colors.textMuted} size={18} />
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueColumn}>
        <Text style={styles.rowValue}>{value}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={actionLabel ? `${value} · ${actionLabel}` : value}
        style={styles.row}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing[4],
    gap: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  navButtonLabel: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: '500',
  },
  image: {
    height: 200,
    borderRadius: radius.lg,
  },
  name: {
    color: colors.text,
    fontSize: 25,
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
  rowValueColumn: {
    alignItems: 'flex-end',
  },
  rowValue: {
    color: colors.text,
    fontSize: 13,
  },
  rowDetail: {
    color: colors.textMuted,
    fontSize: 11,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '500',
    marginTop: spacing[2],
  },
  body: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  captureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  captureItem: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
