import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../src/ui/theme/tokens.ts';

/**
 * Pantalla mínima de la sección Mapa (T028): existe para que la navegación
 * entre pestañas sea recorrible antes de tener contenido. Se sustituye por la
 * implementación real en la Fase 3 (US1).
 */
export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Mapa</Text>
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
