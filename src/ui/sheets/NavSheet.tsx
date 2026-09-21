import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LatLng } from '../../core/content/schema.ts';
import { appleMapsUrl, formatCoordinates, googleMapsUrl } from '../../core/navigation/links.ts';
import { systemLinks } from '../../platform/system/external.ts';
import { Icon } from '../components/Icon.tsx';
import { colors, radius, spacing } from '../theme/tokens.ts';
import { SheetHost } from './SheetHost.tsx';

type Props = {
  visible: boolean;
  onClose: () => void;
  coords: LatLng;
};

const CONFIRMATION_MS = 2000;

/**
 * Panel de navegación (US6, FR-023). Las coordenadas que muestra y el texto
 * que copia son el mismo valor (`formatCoordinates`), nunca dos formatos
 * parecidos. Solo alcanzable desde una ficha, es decir, solo para
 * localizaciones accesibles.
 */
export function NavSheet({ visible, onClose, coords }: Props) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const text = formatCoordinates(coords);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    await systemLinks.copyToClipboard(text);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), CONFIRMATION_MS);
  }

  return (
    <SheetHost visible={visible} onClose={onClose} accessibilityLabel="Navegar hasta la foto">
      <View style={styles.content}>
        <Text style={styles.coords}>{text}</Text>

        <Pressable
          onPress={() => systemLinks.openUrl(googleMapsUrl(coords))}
          accessibilityRole="button"
          accessibilityLabel="Abrir en Google Maps"
          style={styles.option}
        >
          <Icon name="mapTrifold" color={colors.text} size={20} />
          <Text style={styles.optionLabel}>Google Maps</Text>
        </Pressable>

        <Pressable
          onPress={() => systemLinks.openUrl(appleMapsUrl(coords))}
          accessibilityRole="button"
          accessibilityLabel="Abrir en Apple Maps"
          style={styles.option}
        >
          <Icon name="compass" color={colors.text} size={20} />
          <Text style={styles.optionLabel}>Apple Maps</Text>
        </Pressable>

        <Pressable
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel="Copiar coordenadas"
          style={styles.option}
        >
          <Icon
            name={copied ? 'check' : 'copy'}
            color={copied ? colors.accent : colors.text}
            size={20}
          />
          <Text style={styles.optionLabel}>{copied ? 'Copiado' : 'Copiar coordenadas'}</Text>
        </Pressable>
      </View>
    </SheetHost>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[2],
  },
  coords: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing[2],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.section,
  },
  optionLabel: {
    color: colors.text,
    fontSize: 15,
  },
});
