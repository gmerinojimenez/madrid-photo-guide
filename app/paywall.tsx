import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogCounts } from '../src/core/content/counts.ts';
import type {
  PurchaseOutcome,
  RestoreOutcome,
  StoreFailure,
} from '../src/core/entitlement/store-gateway.ts';
import { Icon } from '../src/ui/components/Icon.tsx';
import { useCatalog, usePurchase, useRestore, useStorePrice } from '../src/ui/providers/index.ts';
import { colors, radius, spacing } from '../src/ui/theme/tokens.ts';

const BENEFITS = [
  'Coordenadas exactas de cada localización',
  'Parámetros de cámara de cada toma',
  'Fotografía en detalle de cada localización',
  'Guardar tus localizaciones favoritas',
];

function purchaseFailureMessage(failure: StoreFailure): string {
  switch (failure) {
    case 'offline':
      return 'No se pudo conectar con la tienda. Puedes volver a intentarlo.';
    case 'not-allowed':
      return 'Este dispositivo no permite compras: revisa que tenga una cuenta de tienda o que no tenga restricciones activas.';
    case 'store':
    default:
      return 'La compra no está disponible ahora mismo.';
  }
}

/**
 * Paywall (US1, US2, contracts/screens.md §3). Compra real a través de la
 * tienda (D-001), precio de la tienda (D-008), aviso de alcance por
 * plataforma (D-012) y restaurar (D-011). "Comprar" y "Restaurar" quedan
 * desactivados mientras una acción está en curso.
 */
export default function PaywallScreen() {
  const catalog = useCatalog();
  const purchase = usePurchase();
  const restore = useRestore();
  const price = useStorePrice();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const counts = catalogCounts(catalog);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleClose() {
    router.back();
  }

  async function handlePurchase() {
    setMessage(null);
    setBusy(true);
    const outcome: PurchaseOutcome = await purchase();
    setBusy(false);
    if (outcome.status === 'purchased' || outcome.status === 'already-owned') {
      // R-5: descarta la entrada modal y señala al mapa que abra la compra
      // completada, en lugar de compartir estado con un contexto ad-hoc.
      router.replace({ pathname: '/', params: { purchased: '1' } });
      return;
    }
    if (outcome.status === 'cancelled') {
      // Cancelar es una decisión, no un fallo: ningún mensaje de error (FR-*, §3.2).
      return;
    }
    setMessage(purchaseFailureMessage(outcome.failure));
  }

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

        {price ? <Text style={styles.price}>{price.formatted}</Text> : null}
        <Text style={styles.priceCaption}>Pago único, sin suscripción</Text>

        <Text style={styles.platformNotice}>
          El desbloqueo pertenece a tu cuenta de la tienda de este dispositivo (App Store o Google
          Play): comprar en Android no desbloquea iOS, ni al revés.
        </Text>

        <Pressable
          onPress={handlePurchase}
          disabled={!price || busy}
          accessibilityRole="button"
          accessibilityLabel="Comprar"
          accessibilityState={{ disabled: !price || busy }}
          style={[styles.purchaseButton, (!price || busy) && styles.buttonDisabled]}
        >
          {busy ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.purchaseButtonLabel}>Comprar</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleRestore}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Restaurar compra"
          accessibilityState={{ disabled: busy }}
          style={styles.restoreButton}
        >
          <Text style={styles.restoreButtonLabel}>Restaurar compra</Text>
        </Pressable>

        {message ? <Text style={styles.message}>{message}</Text> : null}
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
  platformNotice: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  purchaseButton: {
    alignSelf: 'stretch',
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonLabel: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '500',
  },
  restoreButton: {
    marginTop: spacing[2],
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  restoreButtonLabel: {
    color: colors.accent300,
    fontSize: 14,
    fontWeight: '500',
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing[2],
  },
});
