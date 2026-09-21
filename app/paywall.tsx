import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogCounts } from '../src/core/content/counts.ts';
import { Icon } from '../src/ui/components/Icon.tsx';
import { useCatalog, usePurchase } from '../src/ui/providers/index.ts';
import { colors, radius, spacing } from '../src/ui/theme/tokens.ts';

const BENEFITS = [
  'Coordenadas exactas de cada localización',
  'Parámetros de cámara de cada toma',
  'Fotografía en detalle de cada localización',
  'Guardar tus localizaciones favoritas',
];

/**
 * Paywall (US2, FR-032, D-011). Precio fijo, sin contactar con ninguna tienda.
 * "Comprar" concede la titularidad simulada y vuelve al mapa con el panel de
 * compra completada (R-5); cerrar sin comprar deja la titularidad intacta.
 */
export default function PaywallScreen() {
  const catalog = useCatalog();
  const purchase = usePurchase();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const counts = catalogCounts(catalog);

  function handleClose() {
    router.back();
  }

  function handlePurchase() {
    purchase();
    // R-5: descarta la entrada modal y señala al mapa que abra la compra
    // completada, en lugar de compartir estado con un contexto ad-hoc.
    router.replace({ pathname: '/', params: { purchased: '1' } });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Pressable
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        style={styles.closeButton}
      >
        <Icon name="x" color={colors.text} size={22} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Desbloquea las {counts.total} localizaciones</Text>
        <Text style={styles.subtitle}>Con el punto exacto de cada una</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Icon name="check" color={colors.accent} size={16} />
              <Text style={styles.benefitLabel}>{benefit}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.price}>9,99 €</Text>
        <Text style={styles.priceCaption}>Pago único, sin suscripción</Text>

        <Pressable
          onPress={handlePurchase}
          accessibilityRole="button"
          accessibilityLabel="Comprar"
          style={styles.purchaseButton}
        >
          <Text style={styles.purchaseButtonLabel}>Comprar</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  closeButton: {
    alignSelf: 'flex-end',
    margin: spacing[4],
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing[4],
    gap: spacing[3],
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '500',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
  },
  benefits: {
    alignSelf: 'stretch',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  benefitLabel: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  price: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '500',
    marginTop: spacing[4],
  },
  priceCaption: {
    color: colors.textMuted,
    fontSize: 12,
  },
  purchaseButton: {
    alignSelf: 'stretch',
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  purchaseButtonLabel: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '500',
  },
});
