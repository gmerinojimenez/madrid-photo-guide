import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { localize } from '../../core/content/localize.ts';
import type { DistanceRadius, ExplorationAvailability } from '../../core/location/ports.ts';
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
  /** Feature 004, FR-017: radio de distancia elegido y disponibilidad del filtro. */
  radius: DistanceRadius;
  onRadiusChange: (radius: DistanceRadius) => void;
  availability: ExplorationAvailability;
};

const RADIUS_OPTIONS: { value: DistanceRadius; label: string }[] = [
  { value: 'under-1km', label: '< 1 km' },
  { value: 'under-3km', label: '< 3 km' },
  { value: 'all', label: 'Todo Madrid' },
];

// Motivo mostrado cuando el permiso está concedido pero el filtro no está
// disponible (contracts/screens.md, panel de filtros). Sin permiso no hace
// falta motivo: los chips siguen tocables y son ellos mismos la invitación.
const UNAVAILABLE_TEXT: Record<'services-off' | 'no-position' | 'far-from-madrid', string> = {
  'services-off': 'Ubicación desactivada en el sistema',
  'no-position': 'Buscando tu posición…',
  'far-from-madrid': 'Estás lejos de Madrid',
};

/**
 * Panel de filtros del mapa (US5 §7, FR-018; feature 004, US3 §3-§6). Chips
 * de tipo y "solo guardados" operativos; el radio de distancia ahora es real:
 * tocable para pedir el permiso si falta, operativo si está disponible, e
 * inactivo con su motivo si el permiso ya está concedido pero no basta.
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
  radius: selectedRadius,
  onRadiusChange,
  availability,
}: Props) {
  // Sin permiso, los chips no se marcan inactivos: son ellos mismos el punto
  // contextual que lo pide (US3 §5). Con permiso concedido pero sin
  // disponibilidad, sí quedan inactivos con su motivo.
  const chipsDisabled = availability.available === false && availability.reason !== 'no-permission';
  const reasonText =
    availability.available === false && availability.reason !== 'no-permission'
      ? UNAVAILABLE_TEXT[availability.reason]
      : null;
  const highlightedRadius = availability.available ? selectedRadius : 'all';
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

        <View style={styles.distanceHeader}>
          <Icon name="compass" color={colors.textMuted} size={18} />
          <Text style={styles.rowLabel}>Distancia</Text>
        </View>
        <View style={styles.chipRow}>
          {RADIUS_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.label}
              selected={highlightedRadius === option.value}
              disabled={chipsDisabled}
              onPress={() => onRadiusChange(option.value)}
            />
          ))}
        </View>
        {reasonText ? <Text style={styles.rowValue}>{reasonText}</Text> : null}

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
  distanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
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
