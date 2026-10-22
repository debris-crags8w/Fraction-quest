/* The subscription (yearly or monthly), sold only in the app (iPhone and Android). The app's shell asks Apple or Google and puts
   the answer on `window.fractionQuestShell.subscription`; this page asks it to buy, restore or manage. The app is
   where Fraction Quest lives: in a plain browser, only the first lesson is open and the rest point to the app. */
import { useSyncExternalStore } from 'react';
import { onAppShellChange } from './app-shell';
import { postToShell } from './native-shell';

export type Plan = 'yearly' | 'monthly';
/** A plan the store has for sale. */
export type PlanOffer = { plan: Plan; price: string; amount?: number | null; currency?: string | null };
export type Subscription = {
  state: 'active' | 'none' | 'unavailable';
  renewsAt?: number | null;
  /** The monthly price text. */
  price?: string | null;
  /** The plans the store has for sale; left out by older apps, which sell only the monthly plan. */
  plans?: PlanOffer[];
  busy?: boolean;
  error?: string | null;
};
export type SubscriptionAction = 'status' | 'buy' | 'restore' | 'manage';
/** Shown when the store has no price yet (the store's own price text replaces it). */
export const LISTED_PRICE = '$4.99';
export const LISTED_YEARLY_PRICE = '$39.99';
const SUBSCRIBED_ONCE_KEY = 'fraction-quest-subscribed-once';

/** What the shell last said, or null outside the app (or in an older app that does not sell subscriptions). */
export function readSubscription(): Subscription | null {
  const raw = (globalThis as { fractionQuestShell?: { subscription?: Partial<Subscription> } }).fractionQuestShell?.subscription;
  if (!raw || typeof raw !== 'object' || !['active', 'none', 'unavailable'].includes(String(raw.state))) return null;
  return {
    state: raw.state as Subscription['state'],
    renewsAt: typeof raw.renewsAt === 'number' && Number.isFinite(raw.renewsAt) ? raw.renewsAt : null,
    price: typeof raw.price === 'string' && raw.price.length <= 24 ? raw.price : null,
    plans: readPlans(raw.plans),
    busy: raw.busy === true,
    error: typeof raw.error === 'string' ? raw.error.slice(0, 200) : null,
  };
}

function readPlans(raw: unknown): PlanOffer[] {
  if (!Array.isArray(raw)) return [];
  const plans: PlanOffer[] = [];
  for (const plan of ['yearly', 'monthly'] as const) {
    const offer = raw.find((item): item is Record<string, unknown> => !!item && typeof item === 'object' && (item as { plan?: unknown }).plan === plan);
    if (!offer || typeof offer.price !== 'string' || !offer.price || offer.price.length > 24) continue;
    plans.push({
      plan,
      price: offer.price,
      amount: typeof offer.amount === 'number' && Number.isFinite(offer.amount) && offer.amount > 0 ? offer.amount : null,
      currency: typeof offer.currency === 'string' && /^[A-Z]{3}$/.test(offer.currency) ? offer.currency : null,
    });
  }
  return plans;
}

/** What the paywall offers: the store's plans, yearly first. An app that names no plans sells only the monthly one. */
export function planChoices(subscription: Subscription): PlanOffer[] {
  return subscription.plans?.length ? subscription.plans : [{ plan: 'monthly', price: subscription.price ?? LISTED_PRICE }];
}

/** How much the yearly plan saves against twelve months, as a whole percent, when both prices are in one currency. */
export function yearlySaving(plans: PlanOffer[]): number | null {
  const yearly = plans.find((offer) => offer.plan === 'yearly');
  const monthly = plans.find((offer) => offer.plan === 'monthly');
  if (!yearly?.amount || !monthly?.amount || yearly.currency !== monthly.currency) return null;
  const saving = Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100);
  return saving > 0 ? saving : null;
}

/** The yearly price spread over twelve months ("$3.33"), or null without the number and currency. */
export function perMonth(offer: PlanOffer): string | null {
  if (!offer.amount || !offer.currency) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: offer.currency }).format(Math.floor((offer.amount / 12) * 100) / 100);
  } catch { return null; }
}

/** Lessons are locked only when the store says there is no subscription. Unknown (no store, offline, not set up
    yet) leaves them open, so a child is never stuck because of the store. */
export const lessonsLocked = (subscription: Subscription | null): boolean => subscription?.state === 'none';

/** In a plain browser (not the app), lessons after the first point to the app. A build with VITE_WEB_LESSONS_OPEN=1
    (the browser tests) keeps them open, unless a test turns the browser limit back on with `__fqWebLimit`. */
export function webLessonsLocked(): boolean {
  const scope = globalThis as { fractionQuestShell?: unknown; ReactNativeWebView?: unknown; __fqWebLimit?: boolean };
  if (scope.fractionQuestShell || scope.ReactNativeWebView) return false;
  const open = String(import.meta.env?.VITE_WEB_LESSONS_OPEN ?? '') === '1';
  return !open || scope.__fqWebLimit === true;
}

export const askShell = (action: SubscriptionAction, plan?: Plan): boolean =>
  postToShell(plan ? { type: 'subscription', action, plan } : { type: 'subscription', action });

/** Whether this device has had an active subscription before (to say "keep going" rather than "unlock"). */
export function subscribedBefore(): boolean {
  try { return localStorage.getItem(SUBSCRIBED_ONCE_KEY) === '1'; } catch { return false; }
}
function rememberSubscribed(subscription: Subscription | null) {
  if (subscription?.state !== 'active') return;
  try { localStorage.setItem(SUBSCRIBED_ONCE_KEY, '1'); } catch { /* storage off: the first-time wording shows */ }
}

let cached: Subscription | null = null;
let cachedKey = '';
function snapshot(): Subscription | null {
  const next = readSubscription();
  const key = JSON.stringify(next);
  if (key !== cachedKey) { cached = next; cachedKey = key; rememberSubscribed(next); }
  return cached;
}

/** The subscription as the shell reports it, updated whenever the shell says something changed. */
export function useSubscription(): Subscription | null {
  return useSyncExternalStore(onAppShellChange, snapshot, () => null);
}
