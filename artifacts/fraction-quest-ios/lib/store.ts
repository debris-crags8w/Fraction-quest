import { useCallback, useEffect, useRef, useState } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AppState, Platform } from 'react-native';
import { PLANS, type Plan, type PlanOffer, type SubscriptionAction, type SubscriptionStatus } from './web-app';

type ExpoIap = typeof import('expo-iap');
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/* The subscription through Apple or Google: yearly or monthly, each with a 7-day free trial. The store owns the
   prices, the trial and cancelling; the shell only asks it, and tells the page. The product IDs must match the ones
   set up in App Store Connect (both in one subscription group) and Google Play. */
export const PRODUCT_IDS: Record<Plan, string> = {
  yearly: process.env.EXPO_PUBLIC_YEARLY_SUBSCRIPTION_ID?.trim() || 'fraction_quest_yearly',
  monthly: process.env.EXPO_PUBLIC_SUBSCRIPTION_ID?.trim() || 'fraction_quest_monthly',
};
const SKUS = PLANS.map((plan) => PRODUCT_IDS[plan]);

const STORE_ERROR = 'The store could not finish that. Please try again in a moment.';
const NOTHING_TO_RESTORE = 'No Fraction Quest subscription was found for this store account.';

export function useStoreSubscription(): [SubscriptionStatus | null, (action: SubscriptionAction, plan?: Plan) => void] {
  const [status, setStatus] = useState<SubscriptionStatus | null>(
    Platform.OS !== 'web' && IS_EXPO_GO ? { state: 'unavailable' } : null,
  );
  const offerTokens = useRef<Partial<Record<Plan, string>>>({});
  const offers = useRef<PlanOffer[]>([]);
  const activeSku = useRef<string | null>(null);
  const connected = useRef(false);
  const storeApi = useRef<ExpoIap | null>(null);

  /** Asks the store again and tells the page; `extra` adds a message, `whenNone` one shown only if nothing is active. */
  const refresh = useCallback(async (extra: Partial<SubscriptionStatus> = {}, whenNone: Partial<SubscriptionStatus> = {}) => {
    const api = storeApi.current;
    if (!connected.current || !api) { setStatus({ state: 'unavailable', ...extra }); return; }
    const prices = {
      price: offers.current.find((offer) => offer.plan === 'monthly')?.price ?? null,
      plans: offers.current,
    };
    try {
      const subscriptions = await api.getActiveSubscriptions(SKUS);
      const current = subscriptions.find((subscription) => SKUS.includes(subscription.productId) && subscription.isActive);
      activeSku.current = current?.productId ?? null;
      setStatus({ state: current ? 'active' : 'none', renewsAt: current?.expirationDateIOS ?? null, ...prices, busy: false, error: null, ...extra, ...(current ? {} : whenNone) });
    } catch {
      setStatus({ state: 'unavailable', ...prices, busy: false, ...extra });
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Stock Expo Go does not include expo-iap's native module. Keep purchases unavailable in previews,
    // and only load expo-iap in an installed app build that contains the module.
    if (IS_EXPO_GO) {
      setStatus({ state: 'unavailable' });
      return;
    }
    let live = true;
    let api: ExpoIap | null = null;
    let updated: { remove: () => void } | null = null;
    let failed: { remove: () => void } | null = null;
    void (async () => {
      try {
        api = await import('expo-iap');
        if (!live) return;
        storeApi.current = api;
        updated = api.purchaseUpdatedListener((purchase) => {
          if (!SKUS.includes(purchase.productId)) return;
          void api?.finishTransaction({ purchase, isConsumable: false }).catch(() => { /* finished again on the next launch */ })
            .finally(() => { void refresh(); });
        });
        failed = api.purchaseErrorListener((error) => {
          void refresh(api?.isUserCancelledError(error) ? {} : { error: STORE_ERROR });
        });
        connected.current = await api.initConnection();
        if (!live) {
          connected.current = false;
          void api.endConnection().catch(() => undefined);
          return;
        }
        const products = await api.fetchProducts({ skus: SKUS, type: 'subs' });
        const found: PlanOffer[] = [];
        for (const plan of PLANS) {
          const product = products?.find((item) => item.id === PRODUCT_IDS[plan]);
          if (!product) continue; // not set up in this store yet: the page leaves this plan out
          const amount = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : null;
          found.push({ plan, price: product.displayPrice, amount, currency: product.currency ?? null });
          const productOffers = (product as { subscriptionOffers?: { offerTokenAndroid?: string | null }[] }).subscriptionOffers ?? [];
          const token = productOffers.find((offer) => offer.offerTokenAndroid)?.offerTokenAndroid;
          if (token) offerTokens.current[plan] = token;
        }
        offers.current = found;
      } catch {
        // No store here, or the subscription is not set up yet: the page treats it as unknown.
        storeApi.current = null;
        connected.current = false;
      }
      if (live) await refresh();
    })();
    // A parent may subscribe, cancel or renew in Settings: check again whenever the app comes back.
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => {
      live = false; updated?.remove(); failed?.remove(); foreground.remove();
      storeApi.current = null;
      connected.current = false;
      void api?.endConnection().catch(() => undefined);
    };
  }, [refresh]);

  const act = useCallback((action: SubscriptionAction, plan: Plan = 'monthly') => {
    if (action === 'status') { void refresh(); return; }
    const api = storeApi.current;
    if (!api) { void refresh(); return; }
    if (action === 'manage') {
      void api.deepLinkToSubscriptions({ skuAndroid: activeSku.current ?? PRODUCT_IDS.monthly }).catch(() => undefined);
      return;
    }
    setStatus((current) => ({ ...(current ?? { state: 'unavailable' }), busy: true, error: null }));
    if (action === 'restore') {
      void api.restorePurchases().then(() => refresh({}, { error: NOTHING_TO_RESTORE }), () => refresh({ error: STORE_ERROR }));
      return;
    }
    const sku = PRODUCT_IDS[plan];
    const token = offerTokens.current[plan];
    const google = token ? { skus: [sku], subscriptionOffers: [{ sku, offerToken: token }] } : { skus: [sku] };
    // The outcome arrives through the listeners above.
    void api.requestPurchase({ type: 'subs', request: { apple: { sku }, google } })
      .catch((error: unknown) => refresh(api.isUserCancelledError(error) ? {} : { error: STORE_ERROR }));
  }, [refresh]);

  return [status, act];
}
