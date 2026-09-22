export type { EntitlementSource } from './source.ts';
export { InMemoryEntitlementSource } from './in-memory.ts';
export type { AppLifecycle } from './lifecycle.ts';
export type { EntitlementCache } from './cache.ts';
export { preferencesEntitlementCache } from './cache.ts';
export { StoreBackedEntitlementSource } from './store-backed.ts';
export type {
  OwnershipQuery,
  PurchaseOutcome,
  RestoreOutcome,
  StoreFailure,
  StoreGateway,
  StorePrice,
} from './store-gateway.ts';
