import { PLANS, type Plan, type PlanOffer } from './web-app';

type ExpoIap = typeof import('expo-iap');

/** The part of expo-iap that finding the store's plans needs (a fake can stand in for it in tests). The trial check is
    iPhone only, and older builds may lack it. */
export type StoreModule = Pick<ExpoIap, 'initConnection' | 'fetchProducts' | 'endConnection'> & Partial<Pick<ExpoIap, 'isEligibleForIntroOfferIOS'>>;

/** `trial`: whether this store account gets the 7-day free trial (Apple and Google give it once), or null when the
    store did not say. The page then promises a trial only when it is not false. */
export type StoreOffers = { offers: PlanOffer[]; tokens: Partial<Record<Plan, string>>; trial: boolean | null };

type StoreOffer = { offerTokenAndroid?: string | null; pricingPhasesAndroid?: { pricingPhaseList?: { priceAmountMicros?: string | null }[] | null } | null };
type StoreProduct = { id: string; platform?: string; price?: unknown; displayPrice: string; currency?: string | null; subscriptionGroupIdIOS?: string | null; subscriptionOffers?: StoreOffer[] | null };

/** A Google Play offer that starts with a free phase (the trial). Play lists only the offers this account can get. */
const isFreeTrial = (offer: StoreOffer) => (offer.pricingPhasesAndroid?.pricingPhaseList ?? [])
  .some((phase) => typeof phase.priceAmountMicros === 'string' && phase.priceAmountMicros !== '' && Number(phase.priceAmountMicros) === 0);
const saysPhases = (offer: StoreOffer) => !!offer.pricingPhasesAndroid?.pricingPhaseList?.length;

/** Turns the store's product list into the plans the page can sell, yearly first, and the Android offer tokens (the
    free-trial offer when Play offers one, so what the page promises is what is bought). */
export function offersFromProducts(products: readonly unknown[] | null | undefined, ids: Record<Plan, string>): StoreOffers {
  const offers: PlanOffer[] = [];
  const tokens: Partial<Record<Plan, string>> = {};
  const trials: (boolean | null)[] = [];
  for (const plan of PLANS) {
    const product = (products as StoreProduct[] | null | undefined)?.find((item) => item.id === ids[plan]);
    if (!product) continue; // not set up in this store yet: the page leaves this plan out
    const amount = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : null;
    offers.push({ plan, price: product.displayPrice, amount, currency: product.currency ?? null });
    const withToken = (product.subscriptionOffers ?? []).filter((offer) => offer.offerTokenAndroid);
    const chosen = withToken.find(isFreeTrial) ?? withToken[0];
    if (chosen?.offerTokenAndroid) tokens[plan] = chosen.offerTokenAndroid;
    trials.push(withToken.some(saysPhases) ? withToken.some(isFreeTrial) : null);
  }
  return { offers, tokens, trial: combine(trials) };
}

/** One plan without the trial means the page promises none; unknown only when no plan says. */
const combine = (trials: (boolean | null)[]): boolean | null =>
  trials.includes(false) ? false : trials.includes(true) ? true : null;

/** On iPhone, asks Apple whether this account can still get the introductory offer (the trial) in the plans' group. */
async function appleTrial(api: StoreModule, products: readonly unknown[] | null | undefined, ids: Record<Plan, string>): Promise<boolean | null> {
  const group = (products as StoreProduct[] | null | undefined)
    ?.find((item) => PLANS.some((plan) => ids[plan] === item.id) && item.platform === 'ios' && item.subscriptionGroupIdIOS)?.subscriptionGroupIdIOS;
  if (!group || typeof api.isEligibleForIntroOfferIOS !== 'function') return null;
  try { return (await api.isEligibleForIntroOfferIOS(group)) === true; } catch { return null; }
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
  if (!found.offers.length) return null;
  const apple = await appleTrial(api, products, ids);
  return apple === null ? found : { ...found, trial: apple };
}
