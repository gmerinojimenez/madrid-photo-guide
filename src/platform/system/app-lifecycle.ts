import { AppState } from 'react-native';

import type { AppLifecycle } from '../../core/entitlement/lifecycle.ts';

/** Adaptador de `AppLifecycle` sobre `AppState` de React Native (contracts/core-api.md §2.3/§4). */
export function appStateLifecycle(): AppLifecycle {
  return {
    onForeground(listener: () => void): () => void {
      let previousState = AppState.currentState;
      const subscription = AppState.addEventListener('change', (nextState) => {
        if (previousState.match(/inactive|background/) && nextState === 'active') {
          listener();
        }
        previousState = nextState;
      });
      let unsubscribed = false;
      return () => {
        if (unsubscribed) return;
        unsubscribed = true;
        subscription.remove();
      };
    },
  };
}
