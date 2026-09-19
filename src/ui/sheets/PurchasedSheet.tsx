import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../components/Icon.tsx';
import { colors, radius, spacing } from '../theme/tokens.ts';
import { SheetHost } from './SheetHost.tsx';

type Props = {
  visible: boolean;
  total: number;
  onClose: () => void;
};

/**
 * Panel de compra completada (US2 §4, FR-030). Se abre solo tras comprar y su
 * única acción es volver al mapa.
 */
export function PurchasedSheet({ visible, total, onClose }: Props) {
  return (
    <SheetHost visible={visible} onClose={onClose} accessibilityLabel="Compra completada">
      <View style={styles.content}>
        <Icon name="check" color={colors.accent} size={32} />
        <Text style={styles.title}>La guía está desbloqueada</Text>
        <Text style={styles.message}>
          Ya tienes acceso a las {total} localizaciones de la guía completa.
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Volver al mapa"
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>Volver al mapa</Text>
        </Pressable>
      </View>
    </SheetHost>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: spacing[3],
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  buttonLabel: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '500',
  },
});
