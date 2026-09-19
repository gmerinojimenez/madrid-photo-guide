import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { catalogCounts } from '../src/core/content/counts.ts';
import { localize } from '../src/core/content/localize.ts';
import { Icon } from '../src/ui/components/Icon.tsx';
import { useCatalog, usePreferencesStore } from '../src/ui/providers/index.ts';
import { colors, radius, spacing } from '../src/ui/theme/tokens.ts';

const TOTAL_STEPS = 3;

/**
 * Presentación inicial (US3, D-002): tres pasos en una sola ruta, con el paso
 * en estado local — no son destinos enlazables ni a los que volver con el
 * gesto de retroceso.
 */
export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const catalog = useCatalog();
  const preferences = usePreferencesStore();
  const router = useRouter();

  const counts = catalogCounts(catalog);
  const freeNames = catalog.locations
    .filter((location) => location.access === 'free')
    .map((location) => localize(location.name, 'es'))
    .join(', ');

  // R-2: la marca se escribe siempre que se abandona la presentación, también
  // al saltar y también al saltar desde un paso intermedio. La navegación de
  // salida sustituye la entrada de historial (`replace`), no la apila.
  async function exitTo(path: '/' | '/paywall') {
    await preferences.set('onboarding.completed', '1');
    router.replace(path);
  }

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
          <View
            key={index}
            style={[styles.progressDot, index === step ? styles.progressDotActive : null]}
          />
        ))}
      </View>

      {step === 0 ? (
        <Step
          icon="mapTrifold"
          title="Guía de fotografía de Madrid"
          body="Localizaciones reales, con el punto exacto de disparo, el mejor momento y los parámetros de cámara de cada toma."
          primaryLabel="Cómo funciona"
          onPrimary={() => setStep(1)}
          secondaryLabel="Saltar"
          onSecondary={() => exitTo('/')}
        />
      ) : null}

      {step === 1 ? (
        <Step
          icon="compass"
          title="Activar ubicación"
          body="Con tu ubicación te decimos qué tan lejos está cada localización. Puedes activarla más tarde: no es obligatorio ahora."
          primaryLabel="Activar ubicación"
          onPrimary={() => setStep(2)}
          secondaryLabel="Ahora no"
          onSecondary={() => setStep(2)}
        />
      ) : null}

      {step === 2 ? (
        <Step
          icon="camera"
          title="Empieza gratis"
          body={`${counts.free} localizaciones gratuitas para empezar: ${freeNames}. La guía completa suma las otras ${counts.premium}.`}
          primaryLabel="Empezar gratis"
          onPrimary={() => exitTo('/')}
          secondaryLabel="Ver la guía completa"
          onSecondary={() => exitTo('/paywall')}
        />
      ) : null}
    </View>
  );
}

function Step({
  icon,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  return (
    <View style={styles.step}>
      <Icon name={icon} color={colors.accent} size={40} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable
        onPress={onPrimary}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonLabel}>{primaryLabel}</Text>
      </Pressable>
      <Pressable
        onPress={onSecondary}
        accessibilityRole="button"
        accessibilityLabel={secondaryLabel}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonLabel}>{secondaryLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[8],
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral700,
  },
  progressDotActive: {
    backgroundColor: colors.accent,
  },
  step: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '500',
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    alignSelf: 'stretch',
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryButton: {
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: colors.accent,
    fontSize: 14,
  },
});
