import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  isFullLocation,
  localize,
  queryLocations,
  viewLocation,
} from '../../src/core/content/index.ts';
import { catalogCounts } from '../../src/core/content/counts.ts';
import type { Location } from '../../src/core/content/schema.ts';
import { LocationMap, type MapMarker } from '../../src/ui/map/LocationMap.tsx';
import { EmptyState } from '../../src/ui/components/EmptyState.tsx';
import { FilterChip } from '../../src/ui/components/FilterChip.tsx';
import { Icon } from '../../src/ui/components/Icon.tsx';
import { FiltersSheet } from '../../src/ui/sheets/FiltersSheet.tsx';
import { LockedSheet } from '../../src/ui/sheets/LockedSheet.tsx';
import { PurchasedSheet } from '../../src/ui/sheets/PurchasedSheet.tsx';
import {
  useCatalog,
  useEntitlement,
  useSavedLocationsStore,
} from '../../src/ui/providers/index.ts';
import { colors, radius, spacing } from '../../src/ui/theme/tokens.ts';

// Centro geográfico de Madrid, con un zoom que encuadra el catálogo entero (14
// localizaciones, de Vallecas a Moncloa). Es el punto de partida del mapa al
// abrir la app; una vez movido por la persona usuaria, expo-maps conserva su
// posición sin que el componente vuelva a fijarla.
const MADRID_CENTER = { lat: 40.4168, lng: -3.7038 };
const INITIAL_ZOOM = 11;

/** Estado de los paneles superpuestos (data-model.md §2, FR-004). Excluyentes entre sí. */
type SheetState =
  | { kind: 'none' }
  | { kind: 'locked'; locationId: string }
  | { kind: 'filters' }
  | { kind: 'purchased' };

/**
 * Sección Mapa (US1/US2/US5, contracts/screens.md). El estado de exploración
 * (`text`, `tagId`, `onlySaved`) vive aquí y sobrevive a abrir y cerrar una
 * ficha (FR-002): es simplemente estado de componente que no se reinicia al
 * perder el foco.
 */
export default function MapScreen() {
  const catalog = useCatalog();
  const entitlement = useEntitlement();
  const savedLocations = useSavedLocationsStore();
  const router = useRouter();
  const { purchased } = useLocalSearchParams<{ purchased?: string }>();

  const [text, setText] = useState('');
  const [tagId, setTagId] = useState<string | null>(null);
  const [onlySaved, setOnlySaved] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' });

  const counts = catalogCounts(catalog);

  // R-5: tras comprar, el paywall vuelve aquí con `?purchased=1` para señalar
  // que toca abrir la compra completada, en lugar de compartir estado ad-hoc.
  // Sincroniza con un parámetro de una fuente externa (el router), el caso que
  // la regla de effects sí espera ver en un efecto.
  useEffect(() => {
    if (purchased) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSheet({ kind: 'purchased' });
      router.setParams({ purchased: undefined });
    }
  }, [purchased, router]);

  // `onlySaved` solo tiene efecto con la compra hecha (data-model.md §2): sin
  // ella la lista de guardados está siempre vacía.
  useFocusEffect(
    useCallback(() => {
      if (!entitlement.owned) {
        setSavedIds([]);
        return;
      }
      let cancelled = false;
      savedLocations.list().then((list) => {
        if (!cancelled) setSavedIds(list);
      });
      return () => {
        cancelled = true;
      };
    }, [entitlement.owned, savedLocations]),
  );

  const filtered = useMemo(() => {
    const byQuery = queryLocations(catalog, { text: text || undefined, tagId: tagId ?? undefined });
    if (!onlySaved) return byQuery;
    const savedSet = new Set(savedIds);
    return byQuery.filter((location) => savedSet.has(location.id));
  }, [catalog, text, tagId, onlySaved, savedIds]);

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

  const lockedLocation: Location | null =
    sheet.kind === 'locked'
      ? (catalog.locations.find((l) => l.id === sheet.locationId) ?? null)
      : null;
  const lockedView = lockedLocation ? viewLocation(lockedLocation, { owned: false }) : null;
  const lockedPreview = lockedView && !isFullLocation(lockedView) ? lockedView : null;

  function handleMarkerPress(id: string) {
    const location = catalog.locations.find((candidate) => candidate.id === id);
    if (!location) return;
    // R-3: la decisión no la toma quien navega, sino la proyección del núcleo.
    const view = viewLocation(location, entitlement);
    if (isFullLocation(view)) {
      router.push(`/location/${view.id}`);
    } else {
      setSheet({ kind: 'locked', locationId: view.id });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        <LocationMap
          markers={markers}
          onMarkerPress={handleMarkerPress}
          camera={{ coords: MADRID_CENTER, zoom: INITIAL_ZOOM }}
        />
        {filtered.length === 0 ? (
          <View style={styles.emptyOverlay}>
            <EmptyState
              icon="magnifyingGlass"
              title="Sin resultados"
              message="Prueba con otro nombre, barrio o etiqueta."
            />
          </View>
        ) : null}
        {!entitlement.owned ? (
          <Pressable
            onPress={() => router.push('/paywall')}
            accessibilityRole="button"
            accessibilityLabel="Ver la guía completa"
            style={styles.trialBar}
          >
            <Text style={styles.trialBarLabel}>
              Modo prueba · {counts.free} de {counts.total} localizaciones
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Buscar por nombre, barrio o etiqueta"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Buscar localizaciones"
            style={styles.search}
          />
          <Pressable
            onPress={() => setSheet({ kind: 'filters' })}
            accessibilityRole="button"
            accessibilityLabel="Filtros"
            style={styles.filtersButton}
          >
            <Icon name="slidersHorizontal" color={colors.text} size={20} />
          </Pressable>
        </View>
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

      <LockedSheet
        visible={sheet.kind === 'locked'}
        preview={lockedPreview}
        neighbourhood={
          lockedLocation
            ? catalog.neighbourhoods.find((n) => n.id === lockedLocation.neighbourhoodId)
            : undefined
        }
        tags={
          lockedLocation
            ? lockedLocation.tagIds
                .map((tagIdValue) => catalog.tags.find((t) => t.id === tagIdValue))
                .filter((t): t is NonNullable<typeof t> => Boolean(t))
            : []
        }
        onUnlock={() => {
          setSheet({ kind: 'none' });
          router.push('/paywall');
        }}
        onDismiss={() => setSheet({ kind: 'none' })}
      />

      <FiltersSheet
        visible={sheet.kind === 'filters'}
        onClose={() => setSheet({ kind: 'none' })}
        tags={catalog.tags}
        tagId={tagId}
        onTagChange={setTagId}
        onlySaved={onlySaved}
        onOnlySavedChange={setOnlySaved}
        onlySavedAvailable={entitlement.owned}
        resultCount={filtered.length}
      />

      <PurchasedSheet
        visible={sheet.kind === 'purchased'}
        total={counts.total}
        onClose={() => setSheet({ kind: 'none' })}
      />
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
  trialBar: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[4],
    backgroundColor: colors.section,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  trialBarLabel: {
    color: colors.accent300,
    fontSize: 13,
    fontWeight: '500',
  },
  controls: {
    backgroundColor: colors.surface,
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    gap: spacing[2],
  },
  search: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing[3],
    color: colors.text,
  },
  filtersButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
});
