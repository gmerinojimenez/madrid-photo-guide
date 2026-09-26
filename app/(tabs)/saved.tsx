import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { localize } from '../../src/core/content/localize.ts';
import type { Location } from '../../src/core/content/schema.ts';
import { EmptyState } from '../../src/ui/components/EmptyState.tsx';
import { ListCard } from '../../src/ui/components/ListCard.tsx';
import {
  useCatalog,
  useEntitlement,
  useSavedLocationsStore,
} from '../../src/ui/providers/index.ts';
import { colors, spacing } from '../../src/ui/theme/tokens.ts';

/**
 * Sección Guardados (US5, contracts/screens.md). Tres estados según
 * titularidad y contenido: sin la compra la lista se muestra vacía aunque el
 * almacén tenga filas de una sesión anterior con titularidad concedida.
 */
export default function SavedScreen() {
  const catalog = useCatalog();
  const entitlement = useEntitlement();
  const savedLocations = useSavedLocationsStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ids, setIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!entitlement.owned) {
        setIds([]);
        return;
      }
      let cancelled = false;
      savedLocations.list().then((list) => {
        if (!cancelled) setIds(list);
      });
      return () => {
        cancelled = true;
      };
    }, [entitlement.owned, savedLocations]),
  );

  // Los identificadores que ya no existen en el catálogo se omiten sin fallar.
  const items = ids
    .map((locationId) => catalog.locations.find((l) => l.id === locationId))
    .filter((l): l is Location => Boolean(l));

  if (!entitlement.owned) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState
          icon="lockSimple"
          title="Guardar es de la guía completa"
          message="Desbloquea la guía completa para guardar tus localizaciones favoritas."
          actionLabel="Ver la guía completa"
          onAction={() => router.push('/paywall')}
        />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState
          icon="bookmarkSimple"
          title="Todavía no guardaste nada"
          message="Guarda tus localizaciones favoritas desde el mapa para verlas aquí."
        />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + spacing[4] }]}
      data={items}
      keyExtractor={(location) => location.id}
      renderItem={({ item }) => (
        <ListCard
          title={localize(item.name, 'es')}
          onPress={() => router.push(`/location/${item.id}`)}
          image={item.thumbnail}
          onImagePress={() => router.push(`/photo-viewer?locationId=${item.id}&usage=thumb`)}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  list: {
    padding: spacing[4],
  },
  separator: {
    height: spacing[2],
  },
});
