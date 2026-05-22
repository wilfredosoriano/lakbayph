/**
 * PremiumContext.js
 *
 * Global RevenueCat state. Wrap the app with <PremiumProvider> once.
 * Consume with usePremium() anywhere in the tree.
 *
 * ── SETUP CHECKLIST ─────────────────────────────────────────────────────────
 *  1. Run:  npx expo install react-native-purchases
 *  2. Replace the placeholder API keys below with your real keys from
 *     https://app.revenuecat.com → Project → API Keys
 *  3. In your RevenueCat dashboard:
 *       • Create a product in App Store Connect / Google Play Console
 *         (Non-Consumable, price ₱199 / $3.99 USD equivalent)
 *       • Create an Entitlement called "premium"
 *       • Create an Offering and attach the product as a package
 *  4. Run:  npx expo run:ios  or  npx expo run:android
 *     (needs a native build — Expo Go won't work with RevenueCat)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// ── ✏️  Replace these with your real RevenueCat API keys ─────────────────────
const RC_API_KEY_IOS     = 'appl_YOUR_IOS_KEY_HERE';
const RC_API_KEY_ANDROID = 'goog_YOUR_ANDROID_KEY_HERE';

// ── Entitlement ID — must match exactly what you created in the RC dashboard ─
export const ENTITLEMENT_ID = 'premium';

// ─────────────────────────────────────────────────────────────────────────────

const PremiumContext = createContext({
  isPremium:          false,
  isLoading:          true,
  premiumPackage:     null,
  purchasePremium:    async () => ({ success: false }),
  restorePurchases:   async () => ({ success: false, isPremium: false }),
  refreshPremiumStatus: async () => {},
});

export function PremiumProvider({ children }) {
  const [isPremium,      setIsPremium]      = useState(false);
  const [isLoading,      setIsLoading]      = useState(true);
  const [premiumPackage, setPremiumPackage] = useState(null);

  // ── Initialize RevenueCat once on mount ────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
        Purchases.configure({ apiKey });

        // Check current customer entitlement
        const customerInfo = await Purchases.getCustomerInfo();
        if (mounted) setIsPremium(!!customerInfo.entitlements.active[ENTITLEMENT_ID]);

        // Fetch available offerings so we have the package ready to purchase
        const offerings = await Purchases.getOfferings();
        const pkg = offerings.current?.availablePackages?.[0] ?? null;
        if (mounted) setPremiumPackage(pkg);
      } catch (_) {
        // Network / config errors — fail gracefully, treat user as free
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    // Listen for purchases made outside the app (e.g. App Store restore)
    const listener = Purchases.addCustomerInfoUpdateListener((info) => {
      if (mounted) setIsPremium(!!info.entitlements.active[ENTITLEMENT_ID]);
    });

    return () => {
      mounted = false;
      listener.remove?.();
    };
  }, []);

  // ── Re-fetch customer info (call after returning from purchase sheet) ───────
  const refreshPremiumStatus = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setIsPremium(!!info.entitlements.active[ENTITLEMENT_ID]);
    } catch (_) {}
  }, []);

  // ── Trigger the OS purchase sheet ─────────────────────────────────────────
  const purchasePremium = useCallback(async () => {
    if (!premiumPackage) return { success: false, error: 'No package available yet. Try again in a moment.' };
    try {
      const { customerInfo } = await Purchases.purchasePackage(premiumPackage);
      const active = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(active);
      return { success: active };
    } catch (e) {
      if (e.userCancelled) return { success: false, cancelled: true };
      return { success: false, error: e.message };
    }
  }, [premiumPackage]);

  // ── Restore prior purchases (required button in App Store guidelines) ───────
  const restorePurchases = useCallback(async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const active = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(active);
      return { success: true, isPremium: active };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, []);

  return (
    <PremiumContext.Provider value={{
      isPremium,
      isLoading,
      premiumPackage,
      purchasePremium,
      restorePurchases,
      refreshPremiumStatus,
    }}>
      {children}
    </PremiumContext.Provider>
  );
}

export const usePremium = () => useContext(PremiumContext);
