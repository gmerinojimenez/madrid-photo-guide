import { describe, expect, it } from '@jest/globals';

import { InMemoryAnalyticsSink } from '../../../src/core/analytics/in-memory.ts';
import { LAST_POSITION_KEY, serializePosition } from '../../../src/core/location/cache.ts';
import { InMemoryDeviceLocation } from '../../../src/core/location/in-memory.ts';
import { LocationTracker } from '../../../src/core/location/tracker.ts';
import type { PermissionOrigin, RawPermission } from '../../../src/core/location/ports.ts';
import { InMemoryPreferencesStore } from '../../../src/core/storage/in-memory.ts';

const UNDETERMINED: RawPermission = { status: 'undetermined', canAskAgain: true, precision: null };
const GRANTED: RawPermission = { status: 'granted', canAskAgain: true, precision: 'precise' };
const APPROXIMATE: RawPermission = { status: 'granted', canAskAgain: true, precision: 'approximate' };
const DENIED: RawPermission = { status: 'denied', canAskAgain: true, precision: null };
const BLOCKED: RawPermission = { status: 'denied', canAskAgain: false, precision: null };

const SOL = { lat: 40.416775, lng: -3.70379 };
const NEAR_SOL = { lat: 40.417, lng: -3.70379 }; // > 25 m al norte

function setup(initial?: Partial<{ permission: RawPermission; servicesEnabled: boolean }>) {
  const device = new InMemoryDeviceLocation(initial);
  const preferences = new InMemoryPreferencesStore();
  const analytics = new InMemoryAnalyticsSink();
  let clock = 1_700_000_000_000;
  const tracker = new LocationTracker({
    device,
    preferences,
    analytics,
    now: () => clock,
  });
  return {
    device,
    preferences,
    analytics,
    tracker,
    advanceTo: (t: number) => {
      clock = t;
    },
  };
}

describe('LocationTracker', () => {
  it('snapshot() antes de start() es undetermined, sin posición, servicios activos', () => {
    const { tracker } = setup();
    expect(tracker.snapshot()).toEqual({ permission: 'undetermined', servicesEnabled: true, position: null });
  });

  it.each<[string, RawPermission, 'undetermined' | 'granted' | 'approximate' | 'denied' | 'blocked']>([
    ['undetermined', UNDETERMINED, 'undetermined'],
    ['granted', GRANTED, 'granted'],
    ['approximate', APPROXIMATE, 'approximate'],
    ['denied', DENIED, 'denied'],
    ['blocked', BLOCKED, 'blocked'],
  ])('start() en %s deja el snapshot en ese estado', async (_name, raw, expected) => {
    const { tracker } = setup({ permission: raw });
    await tracker.start();
    expect(tracker.snapshot().permission).toBe(expected);
  });

  it('start() con permiso concedido y location.last válida publica la posición con source cache y arranca un watcher', async () => {
    const { tracker, preferences, device } = setup({ permission: GRANTED });
    await preferences.set(
      LAST_POSITION_KEY,
      serializePosition({ coords: SOL, accuracy: 'precise', timestamp: 1_699_999_000_000, source: 'live' }),
    );

    await tracker.start();

    expect(tracker.snapshot().position).toMatchObject({ coords: SOL, source: 'cache' });
    expect(device.activeWatchers).toBe(1);
  });

  it.each<[PermissionOrigin]>([['onboarding'], ['contextual'], ['profile']])(
    'request(%s) lanza el diálogo una vez, emite un evento con estado y origen, y arranca el seguimiento si se concede',
    async (origin) => {
      const { tracker, device, analytics } = setup();
      await tracker.start(); // el rastreador siempre está montado antes de que la UI pueda pedir el permiso
      device.answerNextRequestWith(GRANTED);

      const result = await tracker.request(origin);

      expect(result).toBe('granted');
      expect(device.requestCount).toBe(1);
      expect(analytics.events).toEqual([{ name: 'location_permission_result', state: 'granted', origin }]);
      expect(device.activeWatchers).toBe(1);
    },
  );

  it('request() agrupa blocked como "denied" en el evento (FR-028)', async () => {
    const { tracker, device, analytics } = setup();
    device.answerNextRequestWith(BLOCKED);

    await tracker.request('contextual');

    expect(analytics.events).toEqual([{ name: 'location_permission_result', state: 'denied', origin: 'contextual' }]);
  });

  it('request() en blocked no llama al sistema ni emite evento', async () => {
    const { tracker, device, analytics } = setup({ permission: BLOCKED });
    await tracker.start();

    const result = await tracker.request('profile');

    expect(result).toBe('blocked');
    expect(device.requestCount).toBe(0);
    expect(analytics.events).toEqual([]);
  });

  it('una lectura a menos de 25 m se ignora; a 25 m o más se acepta y se escribe en location.last', async () => {
    const { tracker, device, preferences } = setup({ permission: GRANTED });
    await tracker.start();

    device.emit({ coords: SOL, timestamp: 1_700_000_000_000 });
    expect(tracker.snapshot().position?.coords).toEqual(SOL);

    // A menos de 25 m de SOL: se ignora, la posición no cambia.
    const tooClose = { lat: SOL.lat + 0.00001, lng: SOL.lng };
    device.emit({ coords: tooClose, timestamp: 1_700_000_001_000 });
    expect(tracker.snapshot().position?.coords).toEqual(SOL);

    // A más de 25 m: se acepta.
    device.emit({ coords: NEAR_SOL, timestamp: 1_700_000_002_000 });
    expect(tracker.snapshot().position?.coords).toEqual(NEAR_SOL);

    const cached = await preferences.get(LAST_POSITION_KEY);
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached as string)).toMatchObject({ lat: NEAR_SOL.lat, lng: NEAR_SOL.lng });
  });

  it('la primera lectura en vivo sustituye a la cacheada aunque esté a menos de 25 m', async () => {
    const { tracker, preferences, device } = setup({ permission: GRANTED });
    await preferences.set(
      LAST_POSITION_KEY,
      serializePosition({ coords: SOL, accuracy: 'precise', timestamp: 1_699_999_000_000, source: 'live' }),
    );
    await tracker.start();
    expect(tracker.snapshot().position?.source).toBe('cache');

    // Misma coordenada exacta, pero es una lectura en vivo: debe sustituirla.
    device.emit({ coords: SOL, timestamp: 1_700_000_005_000 });

    expect(tracker.snapshot().position).toMatchObject({ coords: SOL, source: 'live', timestamp: 1_700_000_005_000 });
  });

  it('suspend() deja activeWatchers en 0 y conserva la posición', async () => {
    const { tracker, device } = setup({ permission: GRANTED });
    await tracker.start();
    device.emit({ coords: SOL, timestamp: 1_700_000_000_000 });
    expect(device.activeWatchers).toBe(1);

    tracker.suspend();

    expect(device.activeWatchers).toBe(0);
    expect(tracker.snapshot().position?.coords).toEqual(SOL);
  });

  it('resume() tras cambiar el permiso "en Ajustes" aplica el nuevo estado', async () => {
    const { tracker, device } = setup({ permission: DENIED });
    await tracker.start();
    expect(tracker.snapshot().permission).toBe('denied');

    device.setPermission(GRANTED);
    await tracker.resume();

    expect(tracker.snapshot().permission).toBe('granted');
    expect(device.activeWatchers).toBe(1);
  });

  it('paso a denied/blocked borra la posición, para el watcher y borra location.last (FR-025)', async () => {
    const { tracker, device, preferences } = setup({ permission: GRANTED });
    await tracker.start();
    device.emit({ coords: SOL, timestamp: 1_700_000_000_000 });
    expect(device.activeWatchers).toBe(1);
    expect(await preferences.get(LAST_POSITION_KEY)).not.toBeNull();

    device.setPermission(DENIED);
    await tracker.resume();

    expect(tracker.snapshot()).toMatchObject({ permission: 'denied', position: null });
    expect(device.activeWatchers).toBe(0);
    // data-model.md §2: se borra escribiendo la cadena vacía, que se lee como ausente.
    expect(await preferences.get(LAST_POSITION_KEY)).toBe('');
  });

  it('servicios apagados: servicesEnabled false, conservando la posición previa', async () => {
    const { tracker, device } = setup({ permission: GRANTED });
    await tracker.start();
    device.emit({ coords: SOL, timestamp: 1_700_000_000_000 });

    device.setServicesEnabled(false);
    await tracker.resume();

    expect(tracker.snapshot()).toMatchObject({ servicesEnabled: false, position: { coords: SOL } });
  });

  it('subscribe() no emite el estado inicial y no repite snapshots iguales', async () => {
    const { tracker, device } = setup({ permission: GRANTED });
    await tracker.start();

    const seen: unknown[] = [];
    tracker.subscribe((snapshot) => seen.push(snapshot));

    // Misma lectura repetida no debería generar dos notificaciones (movedEnough
    // la descarta la segunda vez, así que ya no llega a updateSnapshot).
    device.emit({ coords: SOL, timestamp: 1_700_000_000_000 });
    device.emit({ coords: SOL, timestamp: 1_700_000_000_001 });

    expect(seen).toHaveLength(1);
  });

  it('subscribe() se puede cancelar y deja de recibir notificaciones', async () => {
    const { tracker, device } = setup({ permission: GRANTED });
    await tracker.start();

    const seen: unknown[] = [];
    const unsubscribe = tracker.subscribe((snapshot) => seen.push(snapshot));
    unsubscribe();

    device.emit({ coords: SOL, timestamp: 1_700_000_000_000 });

    expect(seen).toHaveLength(0);
  });

  it('con un almacén que siempre falla, nada lanza (FR-026)', async () => {
    const device = new InMemoryDeviceLocation({ permission: GRANTED });
    const preferences = new InMemoryPreferencesStore(true);
    const analytics = new InMemoryAnalyticsSink();
    const tracker = new LocationTracker({ device, preferences, analytics, now: () => 1_700_000_000_000 });

    await expect(tracker.start()).resolves.toBeUndefined();
    device.emit({ coords: SOL, timestamp: 1_700_000_000_000 });
    expect(tracker.snapshot().position).toMatchObject({ coords: SOL });

    device.setPermission(DENIED);
    await expect(tracker.resume()).resolves.toBeUndefined();
  });

  it('con un DeviceLocation cuyo watch() rechaza, nada lanza y no queda seguimiento activo', async () => {
    const device = new InMemoryDeviceLocation({ permission: GRANTED });
    device.watch = async () => {
      throw new Error('watch roto (simulado)');
    };
    const preferences = new InMemoryPreferencesStore();
    const analytics = new InMemoryAnalyticsSink();
    const tracker = new LocationTracker({ device, preferences, analytics, now: () => 1_700_000_000_000 });

    await expect(tracker.start()).resolves.toBeUndefined();
    expect(tracker.snapshot().permission).toBe('granted');
  });
});
