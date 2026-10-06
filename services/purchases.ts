import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

/**
 * RevenueCat (Entitlements.swift and RevenueCatKeys.swift).
 * In Expo Go the SDK runs in its Preview API Mode: every call works but purchases are mocked.
 * Real purchases need a development build (expo-dev-client).
 */
export const RevenueCatKeys = {
  testStoreAPIKey: 'test_ejGOWLHFWvvIVLsrjgdwGFFNcHp',
  appleAPIKey: 'appl_YOUR_APPLE_KEY_HERE',
  useTestStore: true,
  premiumEntitlement: 'premium',
  get active() {
    return this.useTestStore ? this.testStoreAPIKey : this.appleAPIKey;
  },
};

let configured = false;

export const PurchasesService = {
  configure() {
    if (configured) return;
    try {
      Purchases.configure({ apiKey: RevenueCatKeys.active });
      configured = true;
    } catch (e) {
      if (__DEV__) console.warn('RevenueCat: configure failed', e);
    }
  },
  isPremium(info: CustomerInfo | null | undefined): boolean {
    return info?.entitlements.active[RevenueCatKeys.premiumEntitlement] !== undefined;
  },
  async customerInfo(): Promise<CustomerInfo | null> {
    try {
      return await Purchases.getCustomerInfo();
    } catch (e) {
      if (__DEV__) console.warn("RevenueCat: couldn't fetch customerInfo", e);
      return null;
    }
  },
  async currentOffering(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current ?? null;
    } catch (e) {
      if (__DEV__) console.warn("RevenueCat: couldn't fetch offerings", e);
      return null;
    }
  },
  async purchase(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
    try {
      const result = await Purchases.purchasePackage(pkg);
      return result.customerInfo;
    } catch (e) {
      if (__DEV__) console.warn('RevenueCat: purchase failed', e);
      return null;
    }
  },
  async restore(): Promise<CustomerInfo | null> {
    try {
      return await Purchases.restorePurchases();
    } catch {
      return null;
    }
  },
  onUpdate(listener: (info: CustomerInfo) => void): () => void {
    try {
      Purchases.addCustomerInfoUpdateListener(listener);
      return () => Purchases.removeCustomerInfoUpdateListener(listener);
    } catch {
      return () => {};
    }
  },
};
