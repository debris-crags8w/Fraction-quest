/* The monthly subscription (iOS app, StoreKit 2 through the in-app Subscriptions plugin).
   The App Store is the source of truth; a copy of the last answer is kept on the device so the app opens
   unlocked instantly and offline, until the period it covers ends. On the website (?paywall=1 preview) a
   test switch can pretend to subscribe; it never runs in the iOS app. */

import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { isNativeApp } from './native';
import { SUBSCRIPTION_PRODUCT_ID } from './access';

export type Entitlement = { active: boolean; productId: string | null; expiresAt: number | null; inTrial: boolean; willRenew: boolean | null; checkedAt: number };
export type ProductInfo = { available: boolean; displayPrice?: string; period?: string; introOffer?: { days: number; eligible: boolean } };
export type PurchaseResult = { status: 'purchased' | 'pending' | 'cancelled'; entitlement: Entitlement };

type RawEntitlement = { active?: boolean; productId?: string; expiresAt?: number; inTrial?: boolean; willRenew?: boolean };
type SubscriptionsPlugin = {
  getProduct(options: { productId: string }): Promise<ProductInfo>;
  purchase(options: { productId: string }): Promise<{ status: PurchaseResult['status']; entitlement?: RawEntitlement }>;
  getEntitlement(options: { productIds: string[] }): Promise<RawEntitlement>;
  restore(options: { productIds: string[] }): Promise<RawEntitlement>;
  manage(): Promise<void>;
  addListener(event: 'entitlementChanged', handler: () => void): Promise<PluginListenerHandle>;
};
const Subscriptions = registerPlugin<SubscriptionsPlugin>('Subscriptions');

export const ENTITLEMENT_KEY = 'fraction-quest-entitlement-v1';
const PREVIEW_KEY = 'fraction-quest-preview-subscribed';
export const NO_ENTITLEMENT: Entitlement = { active: false, productId: null, expiresAt: null, inTrial: false, willRenew: null, checkedAt: 0 };

/** Clean a plugin answer (or a saved copy). */
export function toEntitlement(raw: unknown, now = Date.now()): Entitlement {
  if (!raw || typeof raw !== 'object') return { ...NO_ENTITLEMENT, checkedAt: now };
  const r = raw as RawEntitlement & { checkedAt?: number };
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    active: r.active === true,
    productId: typeof r.productId === 'string' ? r.productId.slice(0, 200) : null,
    expiresAt: num(r.expiresAt),
    inTrial: r.inTrial === true,
    willRenew: typeof r.willRenew === 'boolean' ? r.willRenew : null,
    checkedAt: num(r.checkedAt) ?? now,
  };
}
/** Is a saved copy still good? Only until the end of the period it covers (the App Store is asked again on launch). */
export const isActive = (e: Entitlement, now = Date.now()) => e.active && (e.expiresAt === null || e.expiresAt > now);

const readSaved = (): Entitlement => {
  try { const raw = window.localStorage.getItem(ENTITLEMENT_KEY); return raw ? toEntitlement(JSON.parse(raw)) : NO_ENTITLEMENT; } catch { return NO_ENTITLEMENT; }
};
const save = (e: Entitlement) => { try { window.localStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(e)); } catch { /* storage blocked */ } };

let current: Entitlement = NO_ENTITLEMENT;
const listeners = new Set<(e: Entitlement) => void>();
const publish = (e: Entitlement) => { current = e; save(e); listeners.forEach((fn) => fn(e)); };
export const getEntitlement = () => current;
export const onEntitlement = (fn: (e: Entitlement) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** Website preview only: pretend to be subscribed, for testing the unlocked app with ?paywall=1. */
export function setPreviewSubscribed(on: boolean) {
  if (isNativeApp()) return;
  try { if (on) window.localStorage.setItem(PREVIEW_KEY, '1'); else window.localStorage.removeItem(PREVIEW_KEY); } catch { /* ignore */ }
  publish(on ? { ...NO_ENTITLEMENT, active: true, productId: 'preview', inTrial: true, willRenew: true, checkedAt: Date.now() } : { ...NO_ENTITLEMENT, checkedAt: Date.now() });
}

/** Ask the App Store (or, on the website, the test switch) whether the subscription is active. */
export async function refreshEntitlement(): Promise<Entitlement> {
  if (!isNativeApp()) {
    let on = false; try { on = window.localStorage.getItem(PREVIEW_KEY) === '1'; } catch { /* ignore */ }
    if (on !== current.active) publish(on ? { ...NO_ENTITLEMENT, active: true, productId: 'preview', inTrial: true, willRenew: true, checkedAt: Date.now() } : NO_ENTITLEMENT);
    return current;
  }
  try { publish(toEntitlement(await Subscriptions.getEntitlement({ productIds: [SUBSCRIPTION_PRODUCT_ID] }))); } catch { /* offline: keep the saved copy */ }
  return current;
}

let started = false;
/** Run once at launch: use the saved copy at once, then check with the App Store and keep listening. */
export function startSubscriptionChecks() {
  if (started) return; started = true;
  const saved = readSaved();
  current = isActive(saved) ? saved : { ...saved, active: false };
  void refreshEntitlement();
  if (isNativeApp()) {
    void Subscriptions.addListener('entitlementChanged', () => { void refreshEntitlement(); }).catch(() => { /* old build */ });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void refreshEntitlement(); });
  }
}

export async function loadProduct(): Promise<ProductInfo> {
  if (!isNativeApp()) return { available: false };
  try { return await Subscriptions.getProduct({ productId: SUBSCRIPTION_PRODUCT_ID }); } catch { return { available: false }; }
}

export async function purchase(): Promise<PurchaseResult> {
  const result = await Subscriptions.purchase({ productId: SUBSCRIPTION_PRODUCT_ID });
  const entitlement = result.entitlement ? toEntitlement(result.entitlement) : await refreshEntitlement();
  if (result.entitlement) publish(entitlement);
  return { status: result.status, entitlement };
}

export async function restorePurchases(): Promise<Entitlement> {
  publish(toEntitlement(await Subscriptions.restore({ productIds: [SUBSCRIPTION_PRODUCT_ID] })));
  return current;
}

export async function manageSubscription(): Promise<void> {
  if (isNativeApp()) await Subscriptions.manage();
}
