import { describe, expect, it, jest } from '@jest/globals';

import { InMemoryEntitlementSource } from '../../src/core/entitlement/in-memory.ts';

describe('InMemoryEntitlementSource', () => {
  it('arranca sin la compra por defecto', () => {
    const source = new InMemoryEntitlementSource();
    expect(source.current()).toEqual({ owned: false });
  });

  it('acepta un estado inicial explícito, para montar directamente "con la compra"', () => {
    const source = new InMemoryEntitlementSource({ owned: true });
    expect(source.current()).toEqual({ owned: true });
  });

  it('grant() concede la titularidad y notifica una sola vez', () => {
    const source = new InMemoryEntitlementSource();
    const listener = jest.fn();
    source.subscribe(listener);

    source.grant();

    expect(source.current()).toEqual({ owned: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ owned: true });
  });

  it('grant() es idempotente: llamarla ya concedida no vuelve a notificar', () => {
    const source = new InMemoryEntitlementSource();
    const listener = jest.fn();
    source.subscribe(listener);

    source.grant();
    source.grant();
    source.grant();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribe no emite el estado inicial: quien se suscribe ya ha leído current()', () => {
    const source = new InMemoryEntitlementSource({ owned: true });
    const listener = jest.fn();
    source.subscribe(listener);
    expect(listener).not.toHaveBeenCalled();
  });

  it('la función de desuscripción es idempotente: llamarla dos veces no falla', () => {
    const source = new InMemoryEntitlementSource();
    const listener = jest.fn();
    const unsubscribe = source.subscribe(listener);

    expect(() => {
      unsubscribe();
      unsubscribe();
    }).not.toThrow();

    source.grant();
    expect(listener).not.toHaveBeenCalled();
  });

  it('no persiste: cada instancia nueva arranca sin la compra (FR-029)', () => {
    const first = new InMemoryEntitlementSource();
    first.grant();
    const second = new InMemoryEntitlementSource();
    expect(second.current()).toEqual({ owned: false });
  });
});
