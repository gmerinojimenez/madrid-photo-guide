import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme/tokens.ts';
import { Icon } from './Icon.tsx';
import type { IconName } from '../theme/icons.ts';

type Props = {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Estado vacío compartido: sin resultados de búsqueda, sin guardados, sin compra… */
export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <Icon name={icon} color={colors.textMuted} size={32} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.action}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[8],
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  actionLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
});
