import type { DeviceLocation, RawPermission, RawReading } from './ports.ts';

const UNDETERMINED: RawPermission = { status: 'undetermined', canAskAgain: true, precision: null };

/**
 * Doble de `DeviceLocation` para los tests unitarios del núcleo
 * (contracts/core-api.md). No es un simulador fiel del SDK: expone lo mínimo
 * que `LocationTracker` necesita ejercitar.
 */
export class InMemoryDeviceLocation implements DeviceLocation {
  private permission: RawPermission;
  private nextAnswer: RawPermission | null = null;
  private servicesOn: boolean;
  private watchers = new Set<(reading: RawReading) => void>();
  requestCount = 0;

  constructor(initial?: Partial<{ permission: RawPermission; servicesEnabled: boolean }>) {
    this.permission = initial?.permission ?? UNDETERMINED;
    this.servicesOn = initial?.servicesEnabled ?? true;
  }

  async getPermission(): Promise<RawPermission> {
    return this.permission;
  }

  async requestPermission(): Promise<RawPermission> {
    this.requestCount += 1;
    if (this.nextAnswer) {
      this.permission = this.nextAnswer;
      this.nextAnswer = null;
    }
    return this.permission;
  }

  async servicesEnabled(): Promise<boolean> {
    return this.servicesOn;
  }

  async watch(
    onReading: (reading: RawReading) => void,
    _onError: (error: unknown) => void,
  ): Promise<() => void> {
    this.watchers.add(onReading);
    return () => this.watchers.delete(onReading);
  }

  /** Respuesta que dará el próximo `requestPermission()`. */
  answerNextRequestWith(permission: RawPermission): void {
    this.nextAnswer = permission;
  }

  /** Cambia el permiso "desde Ajustes": afecta a `getPermission()`, no notifica. */
  setPermission(permission: RawPermission): void {
    this.permission = permission;
  }

  setServicesEnabled(enabled: boolean): void {
    this.servicesOn = enabled;
  }

  /** Entrega una lectura a los watchers activos. */
  emit(reading: RawReading): void {
    this.watchers.forEach((watcher) => watcher(reading));
  }

  get activeWatchers(): number {
    return this.watchers.size;
  }
}
