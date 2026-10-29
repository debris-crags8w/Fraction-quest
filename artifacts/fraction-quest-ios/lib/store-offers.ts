import { PLANS, type Plan, type PlanOffer } from './web-app';

type ExpoIap = typeof import('expo-iap');

/** The part of expo-iap that finding the store's plans needs (a fake can stand in for it in tests). */
export type StoreModule = Pick<ExpoIap, 'initConnection' | 'fetchProducts' | 'endConnection'>;

export type StoreOffers = { offers: PlanOffer[]; tokens: Partial<Record<Plan, string>> };

/** Turns the store's product list into the plans the page can sell, yearly first, and the Android offer tokens. */
export function offersFromProducts(products: readonly unknown[] | null | undefined, ids: Record<Plan, string>): StoreOffers {
  const offers: PlanOffer[] = [];
  const tokens: Partial<Record<Plan, string>> = {};
  for (const plan of PLANS) {
    const product = (products as { id: string; price?: unknown; displayPrice: string; currency?: string | null; subscriptionOffers?: { offerTokenAndroid?: string | null }[] }[] | null | undefined)
      ?.find((item) => item.id === ids[plan]);
    if (!product) continue; // not set up in this store yet: the page leaves this plan out
    const amount = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : null;
    offers.push({ plan, price: product.displayPrice, amount, currency: product.currency ?? null });
    const token = (product.subscriptionOffers ?? []).find((offer) => offer.offerTokenAndroid)?.offerTokenAndroid;
    if (token) tokens[plan] = token;
  }
  return { offers, tokens };
}

/** Connects to the store and asks for the plans. Returns null when this store cannot sell anything: no connection, or a
    connection that finds none of the products (not set up yet, "missing metadata", or App Review). The page then treats
    the store as unknown, which leaves lessons open and shows no Buy button that would fail. A thrown error from the store
    is for the caller to treat the same way. `stillWanted` lets a caller that has gone away stop before the product query. */
export async function connectToStore(api: StoreModule, ids: Record<Plan, string>, stillWanted: () => boolean = () => true): Promise<StoreOffers | null> {
  const connected = await api.initConnection();
  if (!connected || !stillWanted()) return null;
  const products = await api.fetchProducts({ skus: PLANS.map((plan) => ids[plan]), type: 'subs' });
  const found = offersFromProducts(products, ids);
  return found.offers.length ? found : null;
}
