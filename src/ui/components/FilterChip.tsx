import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '../theme/tokens.ts';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Nombre accesible alternativo; por defecto, el propio `label`. */
  accessibilityLabel?: string;
};

/** Chip de filtro (tipo de foto, categoría de consejo, "Todo"…), FR-016. */
export function FilterChip({ label, selected, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent900,
  },
  label: {
    color: colors.text,
    fontSize: 13,
  },
  labelSelected: {
    color: colors.accent300,
  },
});
