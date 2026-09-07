import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

/**
 * Pantalla raíz del esqueleto: una pantalla vacía, correctamente compuesta.
 *
 * No muestra contenido de producto (ni texto, ni logotipo, ni navegación): solo
 * rellena la pantalla con el color de fondo del tema, respeta las áreas seguras del
 * sistema y sigue la apariencia clara u oscura. Es la única definición de la pantalla
 * y la comparten Android e iOS sin ninguna bifurcación de plataforma.
 */
export default function App() {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#000000' : '#ffffff';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.fill, { backgroundColor }]}>
        <View style={styles.fill} />
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
