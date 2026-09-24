import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogCounts } from '../../src/core/content/counts.ts';
import { permissionAction } from '../../src/core/location/permission.ts';
import type { PermissionState } from '../../src/core/location/ports.ts';
import { Icon } from '../../src/ui/components/Icon.tsx';
import type { IconName } from '../../src/ui/theme/icons.ts';
import { useCatalog, useEntitlement, useUserLocation } from '../../src/ui/providers/index.ts';
import { colors, radius, spacing } from '../../src/ui/theme/tokens.ts';

const INFO_ROWS: { icon: IconName; label: string }[] = [
  { icon: 'downloadSimple', label: 'Descarga sin conexión' },
  { icon: 'receipt', label: 'Restaurar compra' },
];

// data-model.md §1: `denied` y `blocked` comparten etiqueta ("Denegada"), y
// solo cambia la acción que dispara la fila.
const PERMISSION_LABEL: Record<PermissionState, string> = {
  undetermined: 'Sin pedir',
  granted: 'Concedida',
  approximate: 'Aproximada',
  denied: 'Denegada',
  blocked: 'Denegada',
};

/**
 * Sección Perfil (US7, contracts/screens.md; feature 004, US5). La línea de
 * plan es dinámica; las dos filas informativas se muestran sin acción
 * asociada (FR-034): no son controles rotos, es el alcance de esta entrega.
 * La fila "Ubicación" sí es accionable, según contracts/screens.md.
 */
export default function ProfileScreen() {
  const catalog = useCatalog();
  const entitlement = useEntitlement();
  const { snapshot, requestPermission, openSettings } = useUserLocation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const counts = catalogCounts(catalog);

  function handleLocationPress() {
    if (permissionAction(snapshot.permission) === 'request') {
      requestPermission('profile');
    } else {
      openSettings();
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing[4] }]}
    >
      <View style={styles.planCard}>
        <Text style={styles.planTitle}>{entitlement.owned ? 'Guía completa' : 'Modo prueba'}</Text>
        <Text style={styles.planSubtitle}>
          {entitlement.owned
            ? `Acceso a las ${counts.total} localizaciones`
            : `${counts.free} de ${counts.total} localizaciones`}
        </Text>
        {!entitlement.owned ? (
          <Pressable
            onPress={() => router.push('/paywall')}
            accessibilityRole="button"
            accessibilityLabel="Ver la guía completa"
            style={styles.unlockButton}
          >
            <Text style={styles.unlockButtonLabel}>Ver la guía completa</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.rows}>
        <Pressable
          onPress={handleLocationPress}
          accessibilityRole="button"
          accessibilityLabel="Ubicación"
          style={styles.row}
        >
          <Icon name="compass" color={colors.textMuted} size={20} />
          <Text style={styles.rowLabel}>Ubicación</Text>
          <Text style={styles.rowValue}>{PERMISSION_LABEL[snapshot.permission]}</Text>
        </Pressable>
        {INFO_ROWS.map((row) => (
          <View key={row.label} style={styles.row}>
            <Icon name={row.icon} color={colors.textMuted} size={20} />
            <Text style={styles.rowLabel}>{row.label}</Text>
          </View>
        ))}
      </View>
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
    gap: spacing[4],
  },
  planCard: {
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.section,
    gap: spacing[2],
  },
  planTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '500',
  },
  planSubtitle: {
    color: colors.accent300,
    fontSize: 14,
  },
  unlockButton: {
    marginTop: spacing[2],
    alignSelf: 'flex-start',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  unlockButtonLabel: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: '500',
  },
  rows: {
    gap: spacing[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
});
