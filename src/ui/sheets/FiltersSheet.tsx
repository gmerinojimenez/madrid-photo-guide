import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { localize } from '../../core/content/localize.ts';
import type { Tag } from '../../core/content/schema.ts';
import { Icon } from '../components/Icon.tsx';
import { FilterChip } from '../components/FilterChip.tsx';
import { colors, radius, spacing } from '../theme/tokens.ts';
import { SheetHost } from './SheetHost.tsx';

type Props = {
  visible: boolean;
  onClose: () => void;
  tags: Tag[];
  tagId: string | null;
  onTagChange: (id: string | null) => void;
  onlySaved: boolean;
  onOnlySavedChange: (value: boolean) => void;
  onlySavedAvailable: boolean;
  resultCount: number;
};

/**
 * Panel de filtros del mapa (US5 §7, FR-018). Chips de tipo y "solo
 * guardados" operativos; la distancia se muestra visible pero inactiva y
 * marcada como no disponible (D-012).
 */
export function FiltersSheet({
  visible,
  onClose,
  tags,
  tagId,
  onTagChange,
  onlySaved,
  onOnlySavedChange,
  onlySavedAvailable,
  resultCount,
}: Props) {
  return (
    <SheetHost visible={visible} onClose={onClose} accessibilityLabel="Filtros">
      <View style={styles.content}>
        <Text style={styles.title}>Filtros</Text>

        <Text style={styles.sectionLabel}>Tipo</Text>
        <View style={styles.chipRow}>
          <FilterChip label="Todo" selected={tagId === null} onPress={() => onTagChange(null)} />
          {tags.map((tag) => (
            <FilterChip
              key={tag.id}
              label={localize(tag.label, 'es')}
              selected={tagId === tag.id}
              onPress={() => onTagChange(tag.id)}
            />
          ))}
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Solo guardados</Text>
          <Switch
            value={onlySaved}
            onValueChange={onOnlySavedChange}
            disabled={!onlySavedAvailable}
            accessibilityLabel="Solo guardados"
          />
        </View>

        <View style={[styles.row, styles.disabledRow]} accessibilityState={{ disabled: true }}>
          <Icon name="compass" color={colors.textMuted} size={18} />
          <Text style={styles.rowLabel}>Distancia</Text>
          <Text style={styles.rowValue}>Distancia no disponible</Text>
        </View>

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Ver resultados"
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>Ver {resultCount} localizaciones</Text>
        </Pressable>
      </View>
    </SheetHost>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[3],
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '500',
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  disabledRow: {
    opacity: 0.5,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  rowValue: {
    color: colors.textMuted,
    fontSize: 13,
  },
  button: {
    marginTop: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  buttonLabel: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '500',
  },
});
