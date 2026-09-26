import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isFullLocation, localize, viewLocation } from '../../src/core/content/index.ts';
import { EmptyState } from '../../src/ui/components/EmptyState.tsx';
import { Icon } from '../../src/ui/components/Icon.tsx';
import { ListCard } from '../../src/ui/components/ListCard.tsx';
import { useCatalog, useEntitlement } from '../../src/ui/providers/index.ts';
import { colors, radius, spacing } from '../../src/ui/theme/tokens.ts';

/**
 * Detalle de consejo (US4, contracts/screens.md). Las relacionadas que no
 * existen en el catálogo se omiten sin fallar; tocar una aplica R-3, el mismo
 * punto de decisión que el mapa.
 */
export default function TipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const entitlement = useEntitlement();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tip = catalog.tips.find((candidate) => candidate.id === id);

  if (!tip) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState
          icon="listDashes"
          title="Contenido no disponible"
          message="Este consejo ya no existe en la guía."
          actionLabel="Volver"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const category = catalog.tipCategories.find((c) => c.id === tip.categoryId);
  const related = (tip.relatedLocationIds ?? [])
    .map((locationId) => catalog.locations.find((l) => l.id === locationId))
    .filter((location): location is NonNullable<typeof location> => Boolean(location));

  function handleRelatedPress(locationId: string) {
    const location = catalog.locations.find((candidate) => candidate.id === locationId);
    if (!location) return;
    // R-3: mismo punto de decisión que el mapa.
    const view = viewLocation(location, entitlement);
    if (isFullLocation(view)) {
      router.push(`/location/${view.id}`);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing[4] }]}
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        style={styles.backButton}
      >
        <Icon name="arrowLeft" color={colors.text} size={22} />
      </Pressable>

      {category ? <Text style={styles.category}>{localize(category.label, 'es')}</Text> : null}
      <Text style={styles.title}>{localize(tip.title, 'es')}</Text>

      {tip.body.map((paragraph, index) => (
        <Text key={index} style={styles.body}>
          {localize(paragraph, 'es')}
        </Text>
      ))}

      {related.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Localizaciones relacionadas</Text>
          <View style={styles.relatedList}>
            {related.map((location) => (
              <ListCard
                key={location.id}
                title={localize(location.name, 'es')}
                onPress={() => handleRelatedPress(location.id)}
                image={location.thumbnail}
              />
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  category: {
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '500',
  },
  body: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '500',
    marginTop: spacing[3],
  },
  relatedList: {
    gap: spacing[2],
  },
});
