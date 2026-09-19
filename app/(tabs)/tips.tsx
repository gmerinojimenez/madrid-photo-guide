import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

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
    <View style={styles.container}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[
          { id: null, label: 'Todo' },
          ...catalog.tipCategories.map((c) => ({ id: c.id, label: localize(c.label, 'es') })),
        ]}
        keyExtractor={(item) => item.id ?? 'todo'}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => (
          <FilterChip
            label={item.label}
            selected={categoryId === item.id}
            onPress={() => setCategoryId(item.id)}
          />
        )}
      />
      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        contentContainerStyle={styles.list}
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
  chips: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  list: {
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
