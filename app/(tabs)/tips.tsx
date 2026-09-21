import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { localize, tipsByCategory } from '../../src/core/content/index.ts';
import { FilterChip } from '../../src/ui/components/FilterChip.tsx';
import { useCatalog } from '../../src/ui/providers/index.ts';
import { colors, radius, spacing } from '../../src/ui/theme/tokens.ts';

type Row =
  | { kind: 'header'; id: string; label: string }
  | { kind: 'tip'; id: string; title: string; context?: string };

/**
 * Sección Consejos (US4, contracts/screens.md). Nunca se bloquean, con o sin
 * la compra (FR-011): en esta pantalla no hay candados.
 */
export default function TipsScreen() {
  const catalog = useCatalog();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const groups = useMemo(() => tipsByCategory(catalog), [catalog]);

  const rows: Row[] = useMemo(() => {
    const visible = categoryId ? groups.filter((g) => g.category.id === categoryId) : groups;
    return visible.flatMap((group) => [
      {
        kind: 'header' as const,
        id: `header-${group.category.id}`,
        label: localize(group.category.label, 'es'),
      },
      ...group.tips.map((tip) => ({
        kind: 'tip' as const,
        id: tip.id,
        title: localize(tip.title, 'es'),
        context: tip.context ? localize(tip.context, 'es') : undefined,
      })),
    ]);
  }, [groups, categoryId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsRow}
      >
        <FilterChip
          label="Todo"
          selected={categoryId === null}
          onPress={() => setCategoryId(null)}
        />
        {catalog.tipCategories.map((category) => (
          <FilterChip
            key={category.id}
            label={localize(category.label, 'es')}
            selected={categoryId === category.id}
            onPress={() =>
              setCategoryId((current) => (current === category.id ? null : category.id))
            }
          />
        ))}
      </ScrollView>
      <FlatList
        style={styles.list}
        data={rows}
        keyExtractor={(row) => row.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <Text style={styles.sectionHeader}>{item.label}</Text>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => router.push(`/tip/${item.id}`)}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.context ? <Text style={styles.cardContext}>{item.context}</Text> : null}
            </Pressable>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  chipsRow: {
    flexGrow: 0,
  },
  chips: {
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[2],
  },
  sectionHeader: {
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  card: {
    padding: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing[2],
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  cardContext: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
