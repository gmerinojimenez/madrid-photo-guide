import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../components/Icon.tsx';
import type {
  LocationSheetCase,
  LocationSheetRequest,
} from '../providers/UserLocationProvider.tsx';
import { colors, radius, spacing } from '../theme/tokens.ts';
import { SheetHost } from './SheetHost.tsx';

type Props = {
  request: LocationSheetRequest | null;
};

const COPY: Record<LocationSheetCase, { title: string; body: string; primaryLabel: string }> = {
  denied: {
    title: 'Activar ubicación',
    body: 'Con tu ubicación te decimos a qué distancia está cada localización y te mostramos en el mapa.',
    primaryLabel: 'Permitir ubicación',
  },
  blocked: {
    title: 'Activar ubicación',
    body: 'Con tu ubicación te decimos a qué distancia está cada localización y te mostramos en el mapa. La activaste o la denegaste ya en los ajustes del teléfono.',
    primaryLabel: 'Abrir Ajustes',
  },
  'services-off': {
    title: 'Ubicación desactivada',
    body: 'La ubicación está desactivada en el teléfono. Actívala en los ajustes para ver distancias y tu posición en el mapa.',
    primaryLabel: 'Abrir Ajustes',
  },
};

/**
 * Panel de ubicación (research.md D-010, US2). Solo lo abre `ensureLocation`
 * como respuesta a un toque en un punto contextual (R-G2 de
 * contracts/screens.md); nunca por iniciativa propia de la app.
 */
export function LocationSheet({ request }: Props) {
  const copy = request ? COPY[request.kind] : null;

  return (
    <SheetHost
      visible={request !== null}
      onClose={() => request?.onDismiss()}
      accessibilityLabel={copy?.title ?? 'Ubicación'}
    >
      {request && copy ? (
        <View style={styles.content}>
          <Icon name="compass" color={colors.accent} size={32} />
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          <Pressable
            onPress={request.onPrimaryAction}
            accessibilityRole="button"
            accessibilityLabel={copy.primaryLabel}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonLabel}>{copy.primaryLabel}</Text>
          </Pressable>
          <Pressable
            onPress={request.onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Ahora no"
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonLabel}>Ahora no</Text>
          </Pressable>
        </View>
      ) : null}
    </SheetHost>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '500',
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    alignSelf: 'stretch',
    marginTop: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '500',
  },
  secondaryButton: {
    alignSelf: 'center',
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: colors.accent,
    fontSize: 14,
  },
});
