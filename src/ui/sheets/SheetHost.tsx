import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Modal, Pressable, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../theme/tokens.ts';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Anunciado a lectores de pantalla al abrirse (contracts/screens.md). */
  accessibilityLabel: string;
  children: ReactNode;
};

/**
 * Anfitrión de los cuatro paneles superpuestos (FR-004, D-004): contenido
 * bloqueado, navegar, filtros y compra completada. No son rutas: viven fuera del
 * historial de navegación y se cierran con el gesto de retroceso del sistema
 * (`onRequestClose`, Android) o con el toque en el fondo, nunca navegando.
 */
export function SheetHost({ visible, onClose, accessibilityLabel, children }: Props) {
  const [translateY] = useState(() => new Animated.Value(300));

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : 300,
      duration: 220,
      useNativeDriver: true,
    }).start();

    if (visible) {
      AccessibilityInfo.announceForAccessibility(accessibilityLabel);
    }
  }, [visible, translateY, accessibilityLabel]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      />
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 17, 32, 0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing[6],
    paddingBottom: spacing[8],
  },
});
