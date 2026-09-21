import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

/**
 * Adaptador de sistema (D-007): abrir una URL externa con `Linking` y escribir en
 * el portapapeles con `expo-clipboard`. El núcleo solo construye las cadenas
 * (`src/core/navigation/links.ts`); ejecutar el efecto vive aquí, en el borde.
 */
export interface SystemLinks {
  openUrl(url: string): Promise<void>;
  copyToClipboard(text: string): Promise<void>;
}

export const systemLinks: SystemLinks = {
  async openUrl(url: string) {
    await Linking.openURL(url);
  },
  async copyToClipboard(text: string) {
    await Clipboard.setStringAsync(text);
  },
};
