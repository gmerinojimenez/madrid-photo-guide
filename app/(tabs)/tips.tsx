import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../src/ui/theme/tokens.ts';

/**
 * Pantalla mínima de la sección Consejos (T028). Se sustituye por la
 * implementación real en la Fase 6 (US4).
 */
export default function TipsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Consejos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.text,
    fontSize: 20,
  },
});
