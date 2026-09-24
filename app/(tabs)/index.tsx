import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  isFullLocation,
  localize,
  queryLocations,
  viewLocation,
  visibleDistance,
} from '../../src/core/content/index.ts';
import { catalogCounts } from '../../src/core/content/counts.ts';
import type { Location } from '../../src/core/content/schema.ts';
import {
  effectiveRadius,
  explorationAvailability,
  isGranted,
  withinRadius,
} from '../../src/core/location/index.ts';
import type { DistanceRadius } from '../../src/core/location/ports.ts';
import {
  LocationMap,
  type LocationMapHandle,
  type MapMarker,
} from '../../src/ui/map/LocationMap.tsx';
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
  useUserLocation,
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
  const { snapshot, now, ensureLocation } = useUserLocation();
  const router = useRouter();
  const { purchased } = useLocalSearchParams<{ purchased?: string }>();
  const mapRef = useRef<LocationMapHandle>(null);

  const [text, setText] = useState('');
  const [tagId, setTagId] = useState<string | null>(null);
  const [onlySaved, setOnlySaved] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' });
  const [radius, setRadius] = useState<DistanceRadius>('all');
  const [centerRequested, setCenterRequested] = useState(false);

  const counts = catalogCounts(catalog);
  const availability = explorationAvailability(snapshot);
  const radiusInUse = effectiveRadius(radius, availability);

  // Revocación (data-model.md §3): el radio vuelve a "Todo Madrid" en cuanto
  // el permiso deja de estar concedido; "lejos de Madrid" no lo toca, es
  // temporal y se reaplica solo al volver dentro del umbral. Sincroniza con
  // una fuente externa (el snapshot del rastreador), no con el propio render.
  useEffect(() => {
    if (!isGranted(snapshot.permission)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRadius('all');
    }
  }, [snapshot.permission]);

  // "Centrar en mí" puede pedirse antes de tener una posición: en cuanto
  // llega una (aquí o desde el seguimiento en vivo), se centra sin que haga
  // falta volver a tocar el botón. Mismo motivo: reacciona a un cambio del
  // rastreador, no a un cálculo derivable del propio render.
  useEffect(() => {
    if (centerRequested && snapshot.position) {
      mapRef.current?.centerOn(snapshot.position.coords);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCenterRequested(false);
    }
  }, [centerRequested, snapshot.position]);

  function handleCenterPress() {
    ensureLocation('contextual', () => setCenterRequested(true));
  }

  function handleRadiusChange(next: DistanceRadius) {
    if (isGranted(snapshot.permission)) {
      setRadius(next);
      return;
    }
    ensureLocation('contextual', () => setRadius(next));
  }

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
    const bySaved = onlySaved
      ? byQuery.filter((location) => new Set(savedIds).has(location.id))
      : byQuery;
    // FR-021 (feature 004): filtra con la distancia visible de cada
    // localización (redondeada en las bloqueadas), nunca con la exacta.
    return bySaved.filter((location) =>
      withinRadius(visibleDistance(location, entitlement, snapshot, now), radiusInUse),
    );
  }, [catalog, text, tagId, onlySaved, savedIds, entitlement, snapshot, now, radiusInUse]);

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
  // US4 §1: redondeada por el módulo de acceso; el panel nunca ve los metros
  // exactos ni las coordenadas de una localización bloqueada (FR-020).
  const lockedDistance = lockedLocation
    ? visibleDistance(lockedLocation, entitlement, snapshot, now)
    : ({ kind: 'unavailable', reason: 'no-permission' } as const);

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

  // FR-015: el filtro elegido sigue aplicado, pero deja de surtir efecto
  // mientras se está lejos de Madrid.
  const showFarFromMadridBanner =
    radius !== 'all' && !availability.available && availability.reason === 'far-from-madrid';

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        <LocationMap
          ref={mapRef}
          markers={markers}
          onMarkerPress={handleMarkerPress}
          camera={{ coords: MADRID_CENTER, zoom: INITIAL_ZOOM }}
          showsUserLocation={isGranted(snapshot.permission)}
        />
        <Pressable
          onPress={handleCenterPress}
          accessibilityRole="button"
          accessibilityLabel="Centrar en mi posición"
          style={styles.centerButton}
        >
          <Icon name="crosshair" color={colors.text} size={20} />
        </Pressable>
        {centerRequested && !snapshot.position ? (
          <View style={styles.centerHint} pointerEvents="none">
            <Text style={styles.centerHintLabel}>Buscando tu posición…</Text>
          </View>
        ) : null}
        {showFarFromMadridBanner ? (
          <View style={styles.farBanner} pointerEvents="none">
            <Text style={styles.farBannerLabel}>
              Estás lejos de Madrid: el filtro de distancia está en pausa
            </Text>
          </View>
        ) : null}
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
        distance={lockedDistance}
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
        radius={radius}
        onRadiusChange={handleRadiusChange}
        availability={availability}
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
  centerButton: {
    position: 'absolute',
    right: spacing[4],
    top: spacing[4],
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  centerHint: {
    position: 'absolute',
    top: spacing[4] + 48,
    right: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  centerHintLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  farBanner: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    top: spacing[4],
    backgroundColor: colors.section,
    borderRadius: radius.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    alignItems: 'center',
  },
  farBannerLabel: {
    color: colors.accent300,
    fontSize: 12,
    textAlign: 'center',
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
