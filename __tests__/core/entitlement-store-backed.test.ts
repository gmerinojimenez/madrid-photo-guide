import { describe, expect, it, jest } from '@jest/globals';

import type { ContentLogger, DiscardedPiece } from '../../src/core/content/logging.ts';
import { preferencesEntitlementCache } from '../../src/core/entitlement/cache.ts';
import { StoreBackedEntitlementSource } from '../../src/core/entitlement/store-backed.ts';
import type {
  OwnershipQuery,
  PurchaseOutcome,
  RestoreOutcome,
  StoreGateway,
  StorePrice,
} from '../../src/core/entitlement/store-gateway.ts';
import { InMemoryPreferencesStore } from '../../src/core/storage/in-memory.ts';

/** Doble de quince líneas (D-010): entiende exactamente lo que el orquestador emite. */
class FakeStoreGateway implements StoreGateway {
  ownershipResult: OwnershipQuery = { status: 'known', owned: false };
  purchaseResult: PurchaseOutcome = { status: 'purchased' };
  restoreResult: RestoreOutcome = { status: 'restored' };
  priceResult: StorePrice = { formatted: '9,99 €' };
  private observers = new Set<(owned: boolean) => void>();

  async ownership() {
    return this.ownershipResult;
  }
  async purchase() {
    return this.purchaseResult;
  }
  async restore() {
    return this.restoreResult;
  }
  async price() {
    return this.priceResult;
  }
  observe(listener: (owned: boolean) => void) {
    this.observers.add(listener);
    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      this.observers.delete(listener);
    };
  }
  /** Ayudante de test: empuja una notificación como si la tienda la enviara. */
  push(owned: boolean): void {
    for (const observer of this.observers) observer(owned);
  }
}

function collectingLogger(): { logger: ContentLogger; discarded: DiscardedPiece[] } {
  const discarded: DiscardedPiece[] = [];
  return { logger: { discarded: (piece) => discarded.push(piece) }, discarded };
}

function makeSource(gateway = new FakeStoreGateway()) {
  const prefs = new InMemoryPreferencesStore();
  const cache = preferencesEntitlementCache(prefs);
  const { logger, discarded } = collectingLogger();
  const source = new StoreBackedEntitlementSource(gateway, cache, logger);
  return { source, gateway, prefs, cache, discarded };
}

describe('StoreBackedEntitlementSource', () => {
  describe('current() / hydrate()', () => {
    it('current() antes de hidratar devuelve { owned: false }', () => {
      const { source } = makeSource();
      expect(source.current()).toEqual({ owned: false });
    });

    it("hydrate() publica `true` cuando la caché tiene '1'", async () => {
      const prefs = new InMemoryPreferencesStore();
      await prefs.set('entitlement.owned', '1');
      const cache = preferencesEntitlementCache(prefs);
      const source = new StoreBackedEntitlementSource(new FakeStoreGateway(), cache);

      await source.hydrate();

      expect(source.current()).toEqual({ owned: true });
    });

    it("hydrate() publica `false` cuando la caché tiene '0' o está ausente", async () => {
      const { source } = makeSource();
      await source.hydrate();
      expect(source.current()).toEqual({ owned: false });
    });

    it('hydrate() no consulta a la tienda ni escribe nada', async () => {
      const { source, gateway, prefs } = makeSource();
      const ownershipSpy = jest.spyOn(gateway, 'ownership');
      const setSpy = jest.spyOn(prefs, 'set');

      await source.hydrate();

      expect(ownershipSpy).not.toHaveBeenCalled();
      expect(setSpy).not.toHaveBeenCalled();
    });

    it('hydrate() notifica solo si el valor difiere del vigente', async () => {
      const prefs = new InMemoryPreferencesStore();
      await prefs.set('entitlement.owned', '0');
      const cache = preferencesEntitlementCache(prefs);
      const source = new StoreBackedEntitlementSource(new FakeStoreGateway(), cache);
      const listener = jest.fn();
      source.subscribe(listener);

      await source.hydrate();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('purchase() (US1)', () => {
    it('`purchased` concede, persiste y notifica', async () => {
      const { source, gateway, prefs } = makeSource();
      gateway.purchaseResult = { status: 'purchased' };
      const listener = jest.fn();
      source.subscribe(listener);

      const outcome = await source.purchase();

      expect(outcome).toEqual({ status: 'purchased' });
      expect(source.current()).toEqual({ owned: true });
      expect(await prefs.get('entitlement.owned')).toBe('1');
      expect(listener).toHaveBeenCalledWith({ owned: true });
    });

    it('`already-owned` concede, persiste y notifica igual que `purchased`', async () => {
      const { source, gateway, prefs } = makeSource();
      gateway.purchaseResult = { status: 'already-owned' };
      const listener = jest.fn();
      source.subscribe(listener);

      const outcome = await source.purchase();

      expect(outcome).toEqual({ status: 'already-owned' });
      expect(source.current()).toEqual({ owned: true });
      expect(await prefs.get('entitlement.owned')).toBe('1');
      expect(listener).toHaveBeenCalledWith({ owned: true });
    });

    it('`cancelled` no cambia nada, no escribe caché, no notifica y no registra error', async () => {
      const { source, gateway, prefs, discarded } = makeSource();
      gateway.purchaseResult = { status: 'cancelled' };
      const listener = jest.fn();
      source.subscribe(listener);

      const outcome = await source.purchase();

      expect(outcome).toEqual({ status: 'cancelled' });
      expect(source.current()).toEqual({ owned: false });
      expect(await prefs.get('entitlement.owned')).toBeNull();
      expect(listener).not.toHaveBeenCalled();
      expect(discarded).toEqual([]);
    });

    it('`unavailable` no cambia nada y se registra', async () => {
      const { source, gateway, discarded } = makeSource();
      gateway.purchaseResult = { status: 'unavailable', failure: 'offline' };

      const outcome = await source.purchase();

      expect(outcome).toEqual({ status: 'unavailable', failure: 'offline' });
      expect(source.current()).toEqual({ owned: false });
      expect(discarded).toHaveLength(1);
    });
  });

  describe('restore() (US2)', () => {
    it('`restored` concede y persiste', async () => {
      const { source, gateway, prefs } = makeSource();
      gateway.restoreResult = { status: 'restored' };

      const outcome = await source.restore();

      expect(outcome).toEqual({ status: 'restored' });
      expect(source.current()).toEqual({ owned: true });
      expect(await prefs.get('entitlement.owned')).toBe('1');
    });

    it('`nothing-to-restore` revoca si había titularidad, por ser respuesta afirmativa', async () => {
      const prefs = new InMemoryPreferencesStore();
      await prefs.set('entitlement.owned', '1');
      const cache = preferencesEntitlementCache(prefs);
      const gateway = new FakeStoreGateway();
      const source = new StoreBackedEntitlementSource(gateway, cache);
      await source.hydrate();
      gateway.restoreResult = { status: 'nothing-to-restore' };

      const outcome = await source.restore();

      expect(outcome).toEqual({ status: 'nothing-to-restore' });
      expect(source.current()).toEqual({ owned: false });
      expect(await prefs.get('entitlement.owned')).toBe('0');
    });

    it('`unavailable` no toca el estado', async () => {
      const { source, gateway, discarded } = makeSource();
      gateway.restoreResult = { status: 'unavailable', failure: 'store' };

      const outcome = await source.restore();

      expect(outcome).toEqual({ status: 'unavailable', failure: 'store' });
      expect(source.current()).toEqual({ owned: false });
      expect(discarded).toHaveLength(1);
    });
  });

  describe('reconcile() y watch() (US3)', () => {
    it('una respuesta `known` manda y se persiste en ambos sentidos', async () => {
      const { source, gateway, prefs } = makeSource();
      gateway.ownershipResult = { status: 'known', owned: true };

      await source.reconcile();

      expect(source.current()).toEqual({ owned: true });
      expect(await prefs.get('entitlement.owned')).toBe('1');

      gateway.ownershipResult = { status: 'known', owned: false };
      await source.reconcile();

      expect(source.current()).toEqual({ owned: false });
      expect(await prefs.get('entitlement.owned')).toBe('0');
    });

    it('`unavailable` no cambia nada, no escribe y no notifica', async () => {
      const { source, gateway, prefs, discarded } = makeSource();
      gateway.ownershipResult = { status: 'unavailable', failure: 'offline' };
      const listener = jest.fn();
      source.subscribe(listener);

      await source.reconcile();

      expect(source.current()).toEqual({ owned: false });
      expect(await prefs.get('entitlement.owned')).toBeNull();
      expect(listener).not.toHaveBeenCalled();
      expect(discarded).toHaveLength(1);
    });

    it('dos reconciliaciones iguales notifican una sola vez', async () => {
      const { source, gateway } = makeSource();
      gateway.ownershipResult = { status: 'known', owned: true };
      const listener = jest.fn();
      source.subscribe(listener);

      await source.reconcile();
      await source.reconcile();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('watch() trata cada notificación empujada como una reconciliación con respuesta', async () => {
      const { source, gateway, prefs } = makeSource();
      const listener = jest.fn();
      source.subscribe(listener);
      source.watch();

      gateway.push(true);
      await Promise.resolve();

      expect(source.current()).toEqual({ owned: true });
      expect(listener).toHaveBeenCalledWith({ owned: true });
      expect(await prefs.get('entitlement.owned')).toBe('1');
    });

    it('la baja de watch() es idempotente y detiene las notificaciones', async () => {
      const { source, gateway } = makeSource();
      const unwatch = source.watch();
      const listener = jest.fn();
      source.subscribe(listener);

      unwatch();
      unwatch();
      gateway.push(true);
      await Promise.resolve();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
