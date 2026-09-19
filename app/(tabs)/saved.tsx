import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../src/ui/theme/tokens.ts';

/**
 * Pantalla mínima de la sección Guardados (T028). Se sustituye por la
 * implementación real en la Fase 7 (US5).
 */
export default function SavedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Guardados</Text>
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
