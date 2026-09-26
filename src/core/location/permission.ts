import type { PermissionState, RawPermission } from './ports.ts';

/** Traducción de la respuesta del sistema a los cinco estados (research.md D-002). */
export function toPermissionState(raw: RawPermission): PermissionState {
  if (raw.status === 'undetermined') return 'undetermined';

  if (raw.status === 'granted') {
    return raw.precision === 'approximate' ? 'approximate' : 'granted';
  }

  // raw.status === 'denied'
  return raw.canAskAgain ? 'denied' : 'blocked';
}

/** Qué debe hacer la UI al pedir el permiso en cada estado (contracts/core-api.md, D-010). */
export function permissionAction(state: PermissionState): 'request' | 'openSettings' {
  return state === 'undetermined' || state === 'denied' ? 'request' : 'openSettings';
}

export function isGranted(state: PermissionState): state is 'granted' | 'approximate' {
  return state === 'granted' || state === 'approximate';
}
