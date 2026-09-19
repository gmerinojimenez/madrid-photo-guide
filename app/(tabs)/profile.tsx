import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../src/ui/theme/tokens.ts';

/**
 * Pantalla mínima de la sección Perfil (T028). Se sustituye por la
 * implementación real en la Fase 9 (US7).
 */
export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Perfil</Text>
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
