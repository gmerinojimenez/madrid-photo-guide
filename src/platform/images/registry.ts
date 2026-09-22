import {
  composeImageKey,
  type ImageResolver,
  type ImageSource,
} from '../../core/content/images.ts';
import type { ImageRef } from '../../core/content/schema.ts';

// Única lista de rutas literales del proyecto. Metro resuelve `require` de forma
// estática, así que estas entradas no pueden generarse dinámicamente.
const BUNDLED: Record<string, ImageSource> = {
  // Localizaciones gratuitas: llevan miniatura y detalle.
  'caixaforum/thumb': require('../../../assets/content/photos/caixaforum/thumb.jpg'),
  'caixaforum/detail': require('../../../assets/content/photos/caixaforum/detail.jpg'),
  'calle-alcala/thumb': require('../../../assets/content/photos/calle-alcala/thumb.jpg'),
  'calle-alcala/detail': require('../../../assets/content/photos/calle-alcala/detail.jpg'),
  'capricho-templo-baco/thumb': require('../../../assets/content/photos/capricho-templo-baco/thumb.jpg'),
  'capricho-templo-baco/detail': require('../../../assets/content/photos/capricho-templo-baco/detail.jpg'),
  'debod/thumb': require('../../../assets/content/photos/debod/thumb.jpg'),
  'debod/detail': require('../../../assets/content/photos/debod/detail.jpg'),
  'mayor/thumb': require('../../../assets/content/photos/mayor/thumb.jpg'),
  'mayor/detail': require('../../../assets/content/photos/mayor/detail.jpg'),
  'retiro-rosaleda/thumb': require('../../../assets/content/photos/retiro-rosaleda/thumb.jpg'),
  'retiro-rosaleda/detail': require('../../../assets/content/photos/retiro-rosaleda/detail.jpg'),
  'sala-x/thumb': require('../../../assets/content/photos/sala-x/thumb.jpg'),
  'sala-x/detail': require('../../../assets/content/photos/sala-x/detail.jpg'),
  // Localizaciones de pago añadidas por 003-app-navigation-flows (D-010): solo
  // llevan miniatura, nunca detalle (el validador de la constitución prohíbe
  // empaquetar el detalle de una localización de pago).
  'almudena/thumb': require('../../../assets/content/photos/almudena/thumb.jpg'),
  'azca/thumb': require('../../../assets/content/photos/azca/thumb.jpg'),
  'basilica-san-francisco/thumb': require('../../../assets/content/photos/basilica-san-francisco/thumb.jpg'),
  'bernabeu/thumb': require('../../../assets/content/photos/bernabeu/thumb.jpg'),
  'campo/thumb': require('../../../assets/content/photos/campo/thumb.jpg'),
  'campo-cebada/thumb': require('../../../assets/content/photos/campo-cebada/thumb.jpg'),
  'capricho-estanque/thumb': require('../../../assets/content/photos/capricho-estanque/thumb.jpg'),
  'cason-buen-retiro/thumb': require('../../../assets/content/photos/cason-buen-retiro/thumb.jpg'),
  'castilla/thumb': require('../../../assets/content/photos/castilla/thumb.jpg'),
  'centro-comercial-castellana/thumb': require('../../../assets/content/photos/centro-comercial-castellana/thumb.jpg'),
  'circulo/thumb': require('../../../assets/content/photos/circulo/thumb.jpg'),
  'congreso-diputados/thumb': require('../../../assets/content/photos/congreso-diputados/thumb.jpg'),
  'deposito-canal/thumb': require('../../../assets/content/photos/deposito-canal/thumb.jpg'),
  'edificio-colores/thumb': require('../../../assets/content/photos/edificio-colores/thumb.jpg'),
  'faro/thumb': require('../../../assets/content/photos/faro/thumb.jpg'),
  'gran-via/thumb': require('../../../assets/content/photos/gran-via/thumb.jpg'),
  'jeronimos/thumb': require('../../../assets/content/photos/jeronimos/thumb.jpg'),
  'las-ventas/thumb': require('../../../assets/content/photos/las-ventas/thumb.jpg'),
  'las-vistillas/thumb': require('../../../assets/content/photos/las-vistillas/thumb.jpg'),
  'lavapies/thumb': require('../../../assets/content/photos/lavapies/thumb.jpg'),
  'madrid-rio-puente/thumb': require('../../../assets/content/photos/madrid-rio-puente/thumb.jpg'),
  'matadero/thumb': require('../../../assets/content/photos/matadero/thumb.jpg'),
  'metropolis/thumb': require('../../../assets/content/photos/metropolis/thumb.jpg'),
  'monumento-calvo-sotelo/thumb': require('../../../assets/content/photos/monumento-calvo-sotelo/thumb.jpg'),
  'moratalaz-mirador/thumb': require('../../../assets/content/photos/moratalaz-mirador/thumb.jpg'),
  'nuevos-ministerios/thumb': require('../../../assets/content/photos/nuevos-ministerios/thumb.jpg'),
  'palacio-real/thumb': require('../../../assets/content/photos/palacio-real/thumb.jpg'),
  'plaza-armeria/thumb': require('../../../assets/content/photos/plaza-armeria/thumb.jpg'),
  'plaza-castilla/thumb': require('../../../assets/content/photos/plaza-castilla/thumb.jpg'),
  'plaza-cortes-edificio/thumb': require('../../../assets/content/photos/plaza-cortes-edificio/thumb.jpg'),
  'plaza-lima/thumb': require('../../../assets/content/photos/plaza-lima/thumb.jpg'),
  'plaza-oriente/thumb': require('../../../assets/content/photos/plaza-oriente/thumb.jpg'),
  'puente-perrault/thumb': require('../../../assets/content/photos/puente-perrault/thumb.jpg'),
  'puerta-alcala/thumb': require('../../../assets/content/photos/puerta-alcala/thumb.jpg'),
  'puerta-toledo/thumb': require('../../../assets/content/photos/puerta-toledo/thumb.jpg'),
  'rastro/thumb': require('../../../assets/content/photos/rastro/thumb.jpg'),
  'retiro/thumb': require('../../../assets/content/photos/retiro/thumb.jpg'),
  'retiro-arroyo/thumb': require('../../../assets/content/photos/retiro-arroyo/thumb.jpg'),
  'retiro-lago/thumb': require('../../../assets/content/photos/retiro-lago/thumb.jpg'),
  'rio-manzanares/thumb': require('../../../assets/content/photos/rio-manzanares/thumb.jpg'),
  'semana-santa/thumb': require('../../../assets/content/photos/semana-santa/thumb.jpg'),
  'sol/thumb': require('../../../assets/content/photos/sol/thumb.jpg'),
  'solsticio-invierno/thumb': require('../../../assets/content/photos/solsticio-invierno/thumb.jpg'),
  'telefonica/thumb': require('../../../assets/content/photos/telefonica/thumb.jpg'),
  'tiopio/thumb': require('../../../assets/content/photos/tiopio/thumb.jpg'),
  'toledo/thumb': require('../../../assets/content/photos/toledo/thumb.jpg'),
  'torres/thumb': require('../../../assets/content/photos/torres/thumb.jpg'),
  'trashumancia/thumb': require('../../../assets/content/photos/trashumancia/thumb.jpg'),
  'viaducto-segovia/thumb': require('../../../assets/content/photos/viaducto-segovia/thumb.jpg'),
  'vicente-calderon/thumb': require('../../../assets/content/photos/vicente-calderon/thumb.jpg'),
};

export const imageRegistry: ImageResolver = {
  resolve(ref: ImageRef): ImageSource | null {
    const key = composeImageKey(ref);
    return key in BUNDLED ? BUNDLED[key] : null;
  },
};
