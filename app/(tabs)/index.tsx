import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  isFullLocation,
  localize,
  queryLocations,
  viewLocation,
} from '../../src/core/content/index.ts';
import { LocationMap, type MapMarker } from '../../src/ui/map/LocationMap.tsx';
import { EmptyState } from '../../src/ui/components/EmptyState.tsx';
import { FilterChip } from '../../src/ui/components/FilterChip.tsx';
import { useCatalog, useEntitlement } from '../../src/ui/providers/index.ts';
import { colors, radius, spacing } from '../../src/ui/theme/tokens.ts';

/**
 * Sección Mapa (US1, contracts/screens.md). El estado de exploración
 * (`text`, `tagId`) vive aquí y sobrevive a abrir y cerrar una ficha (FR-002):
 * es simplemente estado de componente que no se reinicia al perder el foco.
 */
export default function MapScreen() {
  const catalog = useCatalog();
  const entitlement = useEntitlement();
  const router = useRouter();

  const [text, setText] = useState('');
  const [tagId, setTagId] = useState<string | null>(null);

  const filtered = useMemo(
    () => queryLocations(catalog, { text: text || undefined, tagId: tagId ?? undefined }),
    [catalog, text, tagId],
  );

  // Memoizada: solo se recalcula al cambiar búsqueda, filtro o titularidad
  // (objetivo de rendimiento de plan.md).
  const markers: MapMarker[] = useMemo(
    () =>
      filtered.map((location) => {
        const view = viewLocation(location, entitlement);
        const full = isFullLocation(view);
        // FR-013: la localización bloqueada nunca se dibuja en su punto exacto.
        const coords = full ? view.coords : view.approximateArea;
        return {
          id: view.id,
          title: localize(view.name, 'es'),
          coords: { lat: coords.lat, lng: coords.lng },
          locked: !full,
        };
      }),
    [filtered, entitlement],
  );

  function handleMarkerPress(id: string) {
    const location = catalog.locations.find((candidate) => candidate.id === id);
    if (!location) return;
    const view = viewLocation(location, entitlement);
    if (isFullLocation(view)) {
      router.push(`/location/${view.id}`);
    }
    // US2 (T049) añade aquí la apertura del panel de contenido bloqueado (R-3).
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        <LocationMap markers={markers} onMarkerPress={handleMarkerPress} />
        {filtered.length === 0 ? (
          <View style={styles.emptyOverlay}>
            <EmptyState
              icon="magnifyingGlass"
              title="Sin resultados"
              message="Prueba con otro nombre, barrio o etiqueta."
            />
          </View>
        ) : null}
      </View>

      <View style={styles.controls}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Buscar por nombre, barrio o etiqueta"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Buscar localizaciones"
          style={styles.search}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <FilterChip label="Todo" selected={tagId === null} onPress={() => setTagId(null)} />
          {catalog.tags.map((tag) => (
            <FilterChip
              key={tag.id}
              label={localize(tag.label, 'es')}
              selected={tagId === tag.id}
              onPress={() => setTagId((current) => (current === tag.id ? null : tag.id))}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  mapArea: {
    flex: 1,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  controls: {
    backgroundColor: colors.surface,
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  search: {
    marginHorizontal: spacing[4],
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing[3],
    color: colors.text,
  },
  chips: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
});
