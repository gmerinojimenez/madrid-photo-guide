import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogCounts } from '../../src/core/content/counts.ts';
import type { RestoreOutcome } from '../../src/core/entitlement/store-gateway.ts';
import { permissionAction } from '../../src/core/location/permission.ts';
import type { PermissionState } from '../../src/core/location/ports.ts';
import { Icon } from '../../src/ui/components/Icon.tsx';
import {
  useCatalog,
  useEntitlement,
  useRestore,
  useUserLocation,
} from '../../src/ui/providers/index.ts';
import { colors, radius, spacing } from '../../src/ui/theme/tokens.ts';

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
 * Sección Perfil (US7, US2, contracts/screens.md §4; feature 004, US5). La
 * línea de plan es dinámica; "Restaurar compra" es un control pulsable
 * (D-011) con sus tres desenlaces; "Descarga sin conexión" sigue siendo
 * informativa (FR-034): no es un control roto, es el alcance de esta
 * entrega. La fila "Ubicación" sí es accionable, según contracts/screens.md.
 */
export default function ProfileScreen() {
  const catalog = useCatalog();
  const entitlement = useEntitlement();
  const restore = useRestore();
  const { snapshot, requestPermission, openSettings } = useUserLocation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const counts = catalogCounts(catalog);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRestore() {
    setMessage(null);
    setBusy(true);
    const outcome: RestoreOutcome = await restore();
    setBusy(false);
    switch (outcome.status) {
      case 'restored':
        setMessage('Compra restaurada: ya tienes acceso a la guía completa.');
        return;
      case 'nothing-to-restore':
        setMessage(
          'No se ha encontrado ninguna compra en esta cuenta de tienda. El desbloqueo pertenece a la plataforma donde se compró.',
        );
        return;
      case 'unavailable':
        setMessage('No se pudo contactar con la tienda. El acceso vigente no cambia.');
    }
  }

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
        <View style={styles.row}>
          <Icon name="downloadSimple" color={colors.textMuted} size={20} />
          <Text style={styles.rowLabel}>Descarga sin conexión</Text>
        </View>
        <Pressable
          onPress={handleRestore}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Restaurar compra"
          accessibilityState={{ disabled: busy }}
          style={styles.row}
        >
          <Icon name="receipt" color={colors.textMuted} size={20} />
          <Text style={styles.rowLabel}>Restaurar compra</Text>
          {busy ? <ActivityIndicator color={colors.textMuted} style={styles.rowSpinner} /> : null}
        </Pressable>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
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
  rowSpinner: {
    marginLeft: spacing[2],
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
