import { Platform, StyleSheet } from 'react-native';
import { AppleMaps, GoogleMaps } from 'expo-maps';

import type { LatLng } from '../../core/content/schema.ts';
import { colors } from '../theme/tokens.ts';

export type MapMarker = {
  id: string;
  title: string;
  coords: LatLng;
  /** FR-014: si la localización no es accesible sin la compra. */
  locked: boolean;
};

type Props = {
  markers: MapMarker[];
  onMarkerPress: (id: string) => void;
  camera?: { coords: LatLng; zoom: number };
};

/**
 * Único componente de mapa del proyecto (D-003): resuelve con `Platform.select`
 * entre `GoogleMaps.View` (Android) y `AppleMaps.View` (iOS) y expone hacia
 * dentro una sola API. Ninguna otra pantalla importa `expo-maps` directamente.
 *
 * Distinción visual accesible/bloqueada (FR-014): en iOS se usa `tintColor`,
 * que `AppleMaps.Marker` sí admite. La versión alpha de `expo-maps` no expone
 * un color por marcador en Android (`GoogleMapsMarker` no tiene ese campo);
 * ambos tipos de marcador se pintan igual ahí hasta que la librería lo permita.
 */
export function LocationMap({ markers, onMarkerPress, camera }: Props) {
  const cameraPosition = camera
    ? {
        coordinates: { latitude: camera.coords.lat, longitude: camera.coords.lng },
        zoom: camera.zoom,
      }
    : undefined;

  // `lockedIds` es una prop propia del componente, no un campo de los objetos
  // de marcador: los tipos `GoogleMapsMarker`/`AppleMapsMarker` no declaran
  // "locked", y los módulos nativos de Expo pueden rechazar una clave que no
  // reconocen dentro de un registro estructurado. Como prop de nivel superior,
  // en cambio, el gestor de vista nativo simplemente la ignora.
  const lockedIds = markers.filter((marker) => marker.locked).map((marker) => marker.id);

  if (Platform.OS === 'ios') {
    const appleMarkers = markers.map((marker) => ({
      id: marker.id,
      coordinates: { latitude: marker.coords.lat, longitude: marker.coords.lng },
      title: marker.title,
      tintColor: marker.locked ? colors.neutral600 : colors.accent,
    }));

    return (
      <AppleMaps.View
        style={StyleSheet.absoluteFill}
        markers={appleMarkers}
        cameraPosition={cameraPosition}
        onMarkerClick={(marker) => marker.id && onMarkerPress(marker.id)}
        // @ts-expect-error prop propia para el doble de test (ver comentario arriba)
        lockedIds={lockedIds}
      />
    );
  }

  const googleMarkers = markers.map((marker) => ({
    id: marker.id,
    coordinates: { latitude: marker.coords.lat, longitude: marker.coords.lng },
    title: marker.title,
  }));

  return (
    <GoogleMaps.View
      style={StyleSheet.absoluteFill}
      markers={googleMarkers}
      cameraPosition={cameraPosition}
      onMarkerClick={(marker) => marker.id && onMarkerPress(marker.id)}
      // @ts-expect-error prop propia para el doble de test (ver comentario arriba)
      lockedIds={lockedIds}
    />
  );
}
