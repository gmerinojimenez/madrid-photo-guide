/**
 * Puerto de vuelta a primer plano (contracts/core-api.md §2.3). Interfaz de un
 * solo método, colocada junto a la titularidad porque es su único consumidor.
 * El adaptador sobre `AppState` de React Native vive en `src/platform/system/`.
 */
export interface AppLifecycle {
  /** Notifica cada vuelta a primer plano. Devuelve la baja. */
  onForeground(listener: () => void): () => void;
}
