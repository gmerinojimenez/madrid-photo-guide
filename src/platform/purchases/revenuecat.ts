import Purchases, { PURCHASES_ERROR_CODE, type CustomerInfo } from 'react-native-purchases';

import type {
  OwnershipQuery,
  PurchaseOutcome,
  RestoreOutcome,
  StoreFailure,
  StoreGateway,
  StorePrice,
} from '../../core/entitlement/store-gateway.ts';
import type { RevenueCatConfig } from './config.ts';

/** Mapeo de códigos de error del SDK a `StoreFailure` (D-004). */
function toStoreFailure(error: unknown): StoreFailure {
  const code = (error as { code?: string } | undefined)?.code;
  switch (code) {
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
      return 'offline';
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return 'not-allowed';
    default:
      return 'store';
  }
}

function isCancelled(error: unknown): boolean {
  return (
    (error as { code?: string } | undefined)?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

function isAlreadyPurchased(error: unknown): boolean {
  return (
    (error as { code?: string } | undefined)?.code ===
    PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR
  );
}

function owns(customerInfo: CustomerInfo, entitlementId: string): boolean {
  return entitlementId in customerInfo.entitlements.active;
}

/**
 * Adaptador de `StoreGateway` sobre `react-native-purchases` (D-003, D-004,
 * contracts/core-api.md §4). Único lugar del proyecto que importa el SDK.
 * Sin `apiKey`, degrada por completo a `unavailable: 'store'` (D-009).
 */
export function createRevenueCatGateway(config: RevenueCatConfig): StoreGateway {
  let configured = false;

  function ensureConfigured(): boolean {
    if (config.apiKey === null) return false;
    if (!configured) {
      Purchases.configure({ apiKey: config.apiKey });
      configured = true;
    }
    return true;
  }

  return {
    async ownership(): Promise<OwnershipQuery> {
      if (!ensureConfigured()) return { status: 'unavailable', failure: 'store' };
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        return { status: 'known', owned: owns(customerInfo, config.entitlementId) };
      } catch (error) {
        return { status: 'unavailable', failure: toStoreFailure(error) };
      }
    },

    async purchase(): Promise<PurchaseOutcome> {
      if (!ensureConfigured()) return { status: 'unavailable', failure: 'store' };
      try {
        const offerings = await Purchases.getOfferings();
        const packageToBuy = offerings.current?.lifetime ?? offerings.current?.availablePackages[0];
        if (!packageToBuy) return { status: 'unavailable', failure: 'store' };
        await Purchases.purchasePackage(packageToBuy);
        return { status: 'purchased' };
      } catch (error) {
        if (isCancelled(error)) return { status: 'cancelled' };
        if (isAlreadyPurchased(error)) return { status: 'already-owned' };
        return { status: 'unavailable', failure: toStoreFailure(error) };
      }
    },

    async restore(): Promise<RestoreOutcome> {
      if (!ensureConfigured()) return { status: 'unavailable', failure: 'store' };
      try {
        const customerInfo = await Purchases.restorePurchases();
        return owns(customerInfo, config.entitlementId)
          ? { status: 'restored' }
          : { status: 'nothing-to-restore' };
      } catch (error) {
        return { status: 'unavailable', failure: toStoreFailure(error) };
      }
    },

    async price(): Promise<StorePrice> {
      if (!ensureConfigured()) return null;
      try {
        const offerings = await Purchases.getOfferings();
        const packageToBuy = offerings.current?.lifetime ?? offerings.current?.availablePackages[0];
        return packageToBuy ? { formatted: packageToBuy.product.priceString } : null;
      } catch {
        return null;
      }
    },

    observe(listener: (owned: boolean) => void): () => void {
      if (!ensureConfigured()) return () => {};
      const sdkListener = (customerInfo: CustomerInfo) => {
        listener(owns(customerInfo, config.entitlementId));
      };
      Purchases.addCustomerInfoUpdateListener(sdkListener);
      let unsubscribed = false;
      return () => {
        if (unsubscribed) return;
        unsubscribed = true;
        Purchases.removeCustomerInfoUpdateListener(sdkListener);
      };
    },
  };
}
