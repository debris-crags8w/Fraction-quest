import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  deepLinkToSubscriptions, endConnection, fetchProducts, finishTransaction, getActiveSubscriptions, initConnection,
  isUserCancelledError, purchaseErrorListener, purchaseUpdatedListener, requestPurchase, restorePurchases,
} from 'expo-iap';
import type { SubscriptionAction, SubscriptionStatus } from './web-app';

/* The monthly subscription through Apple or Google (7-day free trial, then monthly). The store owns the price, the
   trial and cancelling; the shell only asks it, and tells the page. The product ID must match the one set up in
   App Store Connect and Google Play. */
export const SUBSCRIPTION_ID = process.env.EXPO_PUBLIC_SUBSCRIPTION_ID?.trim() || 'fraction_quest_monthly';

const STORE_ERROR = 'The store could not finish that. Please try again in a moment.';
const NOTHING_TO_RESTORE = 'No Fraction Quest subscription was found for this store account.';

export function useStoreSubscription(): [SubscriptionStatus | null, (action: SubscriptionAction) => void] {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const offerToken = useRef<string | null>(null);
  const price = useRef<string | null>(null);
  const connected = useRef(false);

  /** Asks the store again and tells the page; `extra` adds a message, `whenNone` one shown only if nothing is active. */
  const refresh = useCallback(async (extra: Partial<SubscriptionStatus> = {}, whenNone: Partial<SubscriptionStatus> = {}) => {
    if (!connected.current) { setStatus({ state: 'unavailable', ...extra }); return; }
    try {
      const subscriptions = await getActiveSubscriptions([SUBSCRIPTION_ID]);
      const current = subscriptions.find((subscription) => subscription.productId === SUBSCRIPTION_ID && subscription.isActive);
      setStatus({ state: current ? 'active' : 'none', renewsAt: current?.expirationDateIOS ?? null, price: price.current, busy: false, error: null, ...extra, ...(current ? {} : whenNone) });
    } catch {
      setStatus({ state: 'unavailable', price: price.current, busy: false, ...extra });
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let live = true;
    const updated = purchaseUpdatedListener((purchase) => {
      if (purchase.productId !== SUBSCRIPTION_ID) return;
      void finishTransaction({ purchase, isConsumable: false }).catch(() => { /* finished again on the next launch */ })
        .finally(() => { void refresh(); });
    });
    const failed = purchaseErrorListener((error) => {
      void refresh(isUserCancelledError(error) ? {} : { error: STORE_ERROR });
    });
    void (async () => {
      try {
        connected.current = await initConnection();
        const products = await fetchProducts({ skus: [SUBSCRIPTION_ID], type: 'subs' });
        const product = products?.find((item) => item.id === SUBSCRIPTION_ID);
        price.current = product?.displayPrice ?? null;
        const offers = (product as { subscriptionOffers?: { offerTokenAndroid?: string | null }[] } | undefined)?.subscriptionOffers ?? [];
        offerToken.current = offers.find((offer) => offer.offerTokenAndroid)?.offerTokenAndroid ?? null;
      } catch {
        // No store here, or the subscription is not set up yet: the page treats it as unknown.
      }
      if (live) await refresh();
    })();
    // A parent may subscribe, cancel or renew in Settings: check again whenever the app comes back.
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => {
      live = false; updated.remove(); failed.remove(); foreground.remove();
      void endConnection().catch(() => undefined);
    };
  }, [refresh]);

  const act = useCallback((action: SubscriptionAction) => {
    if (action === 'status') { void refresh(); return; }
    if (action === 'manage') {
      void deepLinkToSubscriptions({ skuAndroid: SUBSCRIPTION_ID }).catch(() => undefined);
      return;
    }
    setStatus((current) => ({ ...(current ?? { state: 'unavailable' }), busy: true, error: null }));
    if (action === 'restore') {
      void restorePurchases().then(() => refresh({}, { error: NOTHING_TO_RESTORE }), () => refresh({ error: STORE_ERROR }));
      return;
    }
    const google = offerToken.current
      ? { skus: [SUBSCRIPTION_ID], subscriptionOffers: [{ sku: SUBSCRIPTION_ID, offerToken: offerToken.current }] }
      : { skus: [SUBSCRIPTION_ID] };
    // The outcome arrives through the listeners above.
    void requestPurchase({ type: 'subs', request: { apple: { sku: SUBSCRIPTION_ID }, google } })
      .catch((error: unknown) => refresh(isUserCancelledError(error) ? {} : { error: STORE_ERROR }));
  }, [refresh]);

  return [status, act];
}
