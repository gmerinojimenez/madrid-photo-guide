import { describe, expect, it } from '@jest/globals';

import { isGranted, permissionAction, toPermissionState } from '../../../src/core/location/permission.ts';
import type { PermissionState, RawPermission } from '../../../src/core/location/ports.ts';

describe('toPermissionState', () => {
  it.each<[RawPermission, PermissionState]>([
    [{ status: 'undetermined', canAskAgain: true, precision: null }, 'undetermined'],
    [{ status: 'granted', canAskAgain: true, precision: 'precise' }, 'granted'],
    [{ status: 'granted', canAskAgain: true, precision: 'approximate' }, 'approximate'],
    [{ status: 'denied', canAskAgain: true, precision: null }, 'denied'],
    [{ status: 'denied', canAskAgain: false, precision: null }, 'blocked'],
    // Concedido sin precisión conocida se trata como concedida (research.md D-002).
    [{ status: 'granted', canAskAgain: true, precision: null }, 'granted'],
  ])('%o -> %s', (raw, expected) => {
    expect(toPermissionState(raw)).toBe(expected);
  });
});

describe('permissionAction', () => {
  it.each<[PermissionState, 'request' | 'openSettings']>([
    ['undetermined', 'request'],
    ['denied', 'request'],
    ['granted', 'openSettings'],
    ['approximate', 'openSettings'],
    ['blocked', 'openSettings'],
  ])('%s -> %s', (state, expected) => {
    expect(permissionAction(state)).toBe(expected);
  });
});

describe('isGranted', () => {
  it.each<[PermissionState, boolean]>([
    ['undetermined', false],
    ['denied', false],
    ['blocked', false],
    ['granted', true],
    ['approximate', true],
  ])('%s -> %s', (state, expected) => {
    expect(isGranted(state)).toBe(expected);
  });
});
